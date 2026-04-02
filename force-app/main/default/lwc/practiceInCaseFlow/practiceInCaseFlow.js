import { LightningElement, api } from "lwc";
import { FlowAttributeChangeEvent } from "lightning/flowSupport";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import getPracticeById from "@salesforce/apex/PracticeSearchController.getPracticeById";
import getPracticeByCaseId from "@salesforce/apex/PracticeSearchController.getPracticeByCaseId";

export default class PracticeInCaseFlow extends LightningElement {
  @api isFromFlow;

  @api
  get practiceId() {
    return this._practiceId;
  }
  set practiceId(value) {
    const normalizedValue = value || null;
    const hasChanged = normalizedValue !== this._practiceId;

    this._practiceId = normalizedValue;

    if (!this._isInternalPracticeMutation) {
      this._handleExternalPracticeSelection(normalizedValue);
    }

    if (
      hasChanged ||
      (normalizedValue && this._practiceRecord?.Id !== normalizedValue)
    ) {
      this._maybeInitFromPracticeId();
    }
  }

  @api
  get practiceRecord() {
    return this._practiceRecord;
  }
  set practiceRecord(value) {
    this._practiceRecord = value || null;

    if (!this._practiceRecord?.Id) {
      return;
    }

    if (!this._isInternalPracticeMutation) {
      this._handleExternalPracticeSelection(this._practiceRecord.Id);
    }

    this._maybeInitFromPracticeRecord(this._practiceRecord);
  }

  @api
  get suggestedPracticeId() {
    return this._suggestedPracticeId;
  }
  set suggestedPracticeId(value) {
    const normalizedValue = value || null;

    if (normalizedValue === this._suggestedPracticeId) {
      return;
    }

    this._suggestedPracticeId = normalizedValue;
    this._handleSuggestedPracticeChange();
  }

  @api
  get recordId() {
    return this._recordId;
  }
  set recordId(value) {
    this._recordId = value;
    this._maybeInitFromRecordId();
  }

  @api
  get objectApiName() {
    return this._objectApiName;
  }
  set objectApiName(value) {
    this._objectApiName = value;
    this._maybeInitFromRecordId();
  }

  _practiceId;
  _practiceRecord;
  _suggestedPracticeId;
  _recordId;
  _objectApiName;
  _selectionSource;
  _initializedFromRecordId = false;
  _lastResolvedPracticeId;
  _lastResolvedPracticeRecordId;
  _pendingSuggestedPracticeId;
  _boundPracticeSelectedHandler;
  _boundSuggestedPracticeHandler;
  _isInternalPracticeMutation = false;
  _syncInputTimeout;
  _lastAutoFillToastKey;
  _lastAutoFillToastAt = 0;
  _lastCreatedToastKey;
  _lastCreatedToastAt = 0;

  hasManualPracticeOverride = false;
  showSuggestedPracticeHelper = false;

  connectedCallback() {
    this._boundPracticeSelectedHandler = this.handlePracticeSelected.bind(this);
    this._boundSuggestedPracticeHandler =
      this.handleSuggestedPracticeEvent.bind(this);
    window.addEventListener(
      "practiceselected",
      this._boundPracticeSelectedHandler
    );
    window.addEventListener(
      "providersuggestedpracticechange",
      this._boundSuggestedPracticeHandler
    );
  }

  disconnectedCallback() {
    window.removeEventListener(
      "practiceselected",
      this._boundPracticeSelectedHandler
    );
    window.removeEventListener(
      "providersuggestedpracticechange",
      this._boundSuggestedPracticeHandler
    );
    if (this._syncInputTimeout) {
      window.clearTimeout(this._syncInputTimeout);
    }
  }

  handlePracticeSelected(event) {
    const { practiceRecord } = event.detail || {};

    if (!practiceRecord?.Id) {
      return;
    }

    const shouldShowHelper = practiceRecord.Id === this._suggestedPracticeId;
    this._applyPracticeSelection(practiceRecord, {
      source: shouldShowHelper ? "suggested" : "provider",
      notifyFlow: true,
      syncChild: true,
      showHelper: shouldShowHelper
    });
  }

  handleSuggestedPracticeEvent(event) {
    const suggestedPracticeId = event.detail?.suggestedPracticeId || null;
    const shouldClearPractice = Boolean(event.detail?.shouldClearPractice);
    const forceReplacePractice = Boolean(event.detail?.forceReplacePractice);

    if (shouldClearPractice) {
      this._suggestedPracticeId = null;
      this._clearPracticeState({
        resetManualOverride: true,
        notifyFlow: true,
        syncChild: true
      });
      return;
    }

    const shouldReplaceCurrentPractice =
      Boolean(suggestedPracticeId) &&
      this._practiceId !== suggestedPracticeId &&
      forceReplacePractice;

    if (
      suggestedPracticeId === this._suggestedPracticeId &&
      !shouldReplaceCurrentPractice
    ) {
      return;
    }

    this._suggestedPracticeId = suggestedPracticeId;

    if (forceReplacePractice && suggestedPracticeId) {
      this.hasManualPracticeOverride = false;
      this._selectionSource = "suggested";
    }

    this._handleSuggestedPracticeChange({ forceReplacePractice });
  }

  handleValueChange(event) {
    const nextPracticeId = event.detail.practiceId || null;
    const nextPracticeRecord = event.detail.practiceRecord || null;

    if (!nextPracticeId) {
      this.handleClearSelection();
      return;
    }

    this._selectionSource = "manual";
    this.hasManualPracticeOverride =
      nextPracticeId !== this._suggestedPracticeId;
    this.showSuggestedPracticeHelper = false;

    if (nextPracticeRecord?.Id) {
      this._applyPracticeSelection(nextPracticeRecord, {
        source: "manual",
        notifyFlow: true,
        syncChild: false,
        showHelper: false
      });
      return;
    }

    this._practiceId = nextPracticeId;
    this._practiceRecord = null;
    this._maybeInitFromPracticeId();
  }

  handleClearSelection() {
    this._clearPracticeState({
      resetManualOverride: true,
      notifyFlow: true,
      syncChild: true
    });
  }

  handleInitialPopulate() {
    if (this._practiceId) {
      this._maybeInitFromPracticeId();
    } else {
      this.handleClearSelection();
    }
  }

  finishAction = async ({ outputVariables }) => {
    console.log(
      "🎯 finishAction outputVariables:",
      JSON.stringify(outputVariables)
    );

    if (!outputVariables || outputVariables.length === 0) {
      return;
    }

    let recordId;
    let recordObject;

    for (const outputVar of outputVariables) {
      if (outputVar.name === "practiceRecordId" && outputVar.value) {
        recordId = outputVar.value;
      }
      if (outputVar.name === "practiceRecord" && outputVar.value) {
        recordObject = outputVar.value;
      }
    }

    if (recordObject?.Id) {
      console.log("🆕 Nuevo Practice recibido desde Flow:", recordObject);
      this._applyPracticeSelection(recordObject, {
        source: "manual",
        notifyFlow: true,
        syncChild: true,
        showHelper: false,
        delayMs: 400,
        showCreatedToast: true
      });
      return;
    }

    if (recordId) {
      console.log("📥 Obteniendo Practice desde Apex con Id:", recordId);

      try {
        const practice = await getPracticeById({ practiceId: recordId });
        console.log("✅ Practice recuperado:", practice);
        if (practice) {
          this._applyPracticeSelection(practice, {
            source: "manual",
            notifyFlow: true,
            syncChild: true,
            showHelper: false,
            delayMs: 400,
            showCreatedToast: true
          });
        }
      } catch (error) {
        console.error("❌ Error al obtener Practice por Id:", error);
      }
    }
  };

  renderedCallback() {
    this._maybeInitFromRecordId();
  }

  _isAccountContext() {
    if (this._objectApiName) {
      return this._objectApiName === "Account";
    }
    return (
      typeof this._recordId === "string" && this._recordId.startsWith("001")
    );
  }

  _isCaseContext() {
    if (this._objectApiName) {
      return this._objectApiName === "Case";
    }
    return (
      typeof this._recordId === "string" && this._recordId.startsWith("500")
    );
  }

  async _populateFromRecordId(
    recordId,
    { source = "recordContext", notifyFlow = true, showHelper = false } = {}
  ) {
    try {
      const practice = await getPracticeById({ practiceId: recordId });
      if (!practice) {
        return;
      }

      if (
        source === "recordContext" &&
        (this._suggestedPracticeId || this.hasManualPracticeOverride)
      ) {
        return;
      }

      if (
        source === "manual" &&
        this._practiceId &&
        this._practiceId !== recordId
      ) {
        return;
      }

      if (source === "suggested" && this._suggestedPracticeId !== recordId) {
        return;
      }

      this._applyPracticeSelection(practice, {
        source,
        notifyFlow,
        syncChild: true,
        showHelper
      });
    } catch (error) {
      console.error("❌ Error al obtener Practice por Id:", error);
    }
  }

  async _populateFromCaseId(
    recordId,
    { source = "recordContext", notifyFlow = true, showHelper = false } = {}
  ) {
    try {
      const practice = await getPracticeByCaseId({ caseId: recordId });
      if (!practice) {
        return;
      }

      if (
        source === "recordContext" &&
        (this._suggestedPracticeId || this.hasManualPracticeOverride)
      ) {
        return;
      }

      if (
        source === "manual" &&
        this._practiceId &&
        this._practiceId !== recordId
      ) {
        return;
      }

      this._applyPracticeSelection(practice, {
        source,
        notifyFlow,
        syncChild: true,
        showHelper
      });
    } catch (error) {
      console.error("❌ Error al obtener Practice por Case Id:", error);
    }
  }

  _maybeInitFromRecordId() {
    if (this._initializedFromRecordId) {
      return;
    }

    if (this._practiceId) {
      return;
    }

    if (!this._recordId) {
      const inferredId = this._getAccountIdFromUrl();
      if (inferredId) {
        this._recordId = inferredId;
      } else {
        return;
      }
    }

    this._initializedFromRecordId = true;

    if (this._isAccountContext()) {
      this._populateFromRecordId(this._recordId, { source: "recordContext" });
    } else if (this._isCaseContext()) {
      this._populateFromCaseId(this._recordId, { source: "recordContext" });
    }
  }

  _maybeInitFromPracticeId() {
    if (!this._practiceId) {
      return;
    }

    if (this._practiceRecord?.Id === this._practiceId) {
      this._maybeInitFromPracticeRecord(this._practiceRecord);
      return;
    }

    if (this._lastResolvedPracticeId === this._practiceId) {
      return;
    }

    this._lastResolvedPracticeId = this._practiceId;

    const source = this._selectionSource || "manual";
    const showHelper =
      source === "suggested" && this._practiceId === this._suggestedPracticeId;

    if (
      typeof this._practiceId === "string" &&
      this._practiceId.startsWith("500")
    ) {
      this._populateFromCaseId(this._practiceId, { source, showHelper });
    } else {
      this._populateFromRecordId(this._practiceId, { source, showHelper });
    }
  }

  _maybeInitFromPracticeRecord(record) {
    if (!record?.Id) {
      return;
    }

    if (
      this._lastResolvedPracticeRecordId === record.Id &&
      this._isPracticeInputSynced(record)
    ) {
      return;
    }

    this._lastResolvedPracticeRecordId = record.Id;

    const source = this._selectionSource || "manual";
    const showHelper =
      source === "suggested" && record.Id === this._suggestedPracticeId;

    this._applyPracticeSelection(record, {
      source,
      notifyFlow: false,
      syncChild: true,
      showHelper
    });
  }

  _handleExternalPracticeSelection(practiceId) {
    if (!practiceId) {
      this._selectionSource = null;
      this.hasManualPracticeOverride = false;
      this.showSuggestedPracticeHelper = false;
      return;
    }

    if (this._suggestedPracticeId && practiceId === this._suggestedPracticeId) {
      this._selectionSource = "suggested";
      this.hasManualPracticeOverride = false;
      this.showSuggestedPracticeHelper = true;
      return;
    }

    this._selectionSource = "manual";
    this.hasManualPracticeOverride = true;
    this.showSuggestedPracticeHelper = false;
  }

  _handleSuggestedPracticeChange({ forceReplacePractice = false } = {}) {
    if (!this._suggestedPracticeId) {
      this.showSuggestedPracticeHelper = false;
      return;
    }

    if (
      !forceReplacePractice &&
      this.hasManualPracticeOverride &&
      this._practiceId &&
      this._practiceId !== this._suggestedPracticeId
    ) {
      return;
    }

    if (this._practiceId === this._suggestedPracticeId) {
      this._selectionSource = "suggested";
      this.hasManualPracticeOverride = false;
      this.showSuggestedPracticeHelper = true;

      if (this._practiceRecord?.Id === this._suggestedPracticeId) {
        this._syncPracticeInput(this._practiceRecord);
      } else {
        this._maybeInitFromPracticeId();
      }
      return;
    }

    this._applySuggestedPracticeSelection(this._suggestedPracticeId, {
      forceReplacePractice
    });
  }

  async _applySuggestedPracticeSelection(
    practiceId,
    { forceReplacePractice = false } = {}
  ) {
    if (
      !practiceId ||
      (!forceReplacePractice && this.hasManualPracticeOverride)
    ) {
      return;
    }

    if (this._practiceRecord?.Id === practiceId) {
      this._applyPracticeSelection(this._practiceRecord, {
        source: "suggested",
        notifyFlow: true,
        syncChild: true,
        showHelper: true
      });
      return;
    }

    if (this._pendingSuggestedPracticeId === practiceId) {
      return;
    }

    this._pendingSuggestedPracticeId = practiceId;

    try {
      const practice = await getPracticeById({ practiceId });
      if (
        !practice ||
        this._suggestedPracticeId !== practiceId ||
        (!forceReplacePractice && this.hasManualPracticeOverride)
      ) {
        return;
      }

      this._applyPracticeSelection(practice, {
        source: "suggested",
        notifyFlow: true,
        syncChild: true,
        showHelper: true
      });
    } catch (error) {
      console.error("❌ Error al autocompletar el practice:", error);
    } finally {
      if (this._pendingSuggestedPracticeId === practiceId) {
        this._pendingSuggestedPracticeId = null;
      }
    }
  }

  _applyPracticeSelection(
    practice,
    {
      source = "manual",
      notifyFlow = false,
      syncChild = true,
      showHelper = false,
      delayMs = 150,
      focusSearch = false,
      showCreatedToast = false,
      showProviderAutoFillToast = false
    } = {}
  ) {
    if (!practice?.Id) {
      return;
    }

    this._setPracticeState(practice, source, showHelper);
    this._syncPracticeInput(
      practice,
      delayMs,
      syncChild,
      focusSearch || source === "suggested",
      showCreatedToast
    );

    if (showCreatedToast) {
      this._showPracticeCreatedToast(practice);
    }

    if (
      showProviderAutoFillToast ||
      source === "suggested" ||
      source === "provider"
    ) {
      this._showProviderAutoFillToast(practice);
    }

    if (notifyFlow) {
      this._dispatchPracticeFlowChanges();
    }
  }

  _setPracticeState(practice, source, showHelper) {
    this._isInternalPracticeMutation = true;
    this._practiceRecord = practice;
    this._practiceId = practice.Id;
    this._lastResolvedPracticeId = practice.Id;
    this._lastResolvedPracticeRecordId = practice.Id;
    this._selectionSource = source;

    if (source === "suggested") {
      this.hasManualPracticeOverride = false;
      this.showSuggestedPracticeHelper = showHelper;
    } else {
      if (source === "manual") {
        this.hasManualPracticeOverride = true;
      }
      this.showSuggestedPracticeHelper = false;
    }

    this._isInternalPracticeMutation = false;
  }

  _syncPracticeInput(
    practice,
    delayMs = 0,
    shouldSync = true,
    shouldFocusSearch = false,
    showCreatedToast = false
  ) {
    if (!shouldSync) {
      return;
    }

    if (this._syncInputTimeout) {
      window.clearTimeout(this._syncInputTimeout);
    }

    // eslint-disable-next-line @lwc/lwc/no-async-operation
    this._syncInputTimeout = window.setTimeout(() => {
      try {
        const input = this.template.querySelector("c-practice-search-input");
        if (!input) {
          return;
        }

        const isPracticeInputSynced = this._isPracticeInputSynced(practice);

        if (
          typeof input.setSelectedPractice === "function" &&
          (!isPracticeInputSynced || showCreatedToast)
        ) {
          input.setSelectedPractice(practice);
          console.log(`✨ Practice autocompletado: ${practice.Name}`);
        }

        if (shouldFocusSearch && typeof input.focusSearchInput === "function") {
          input.focusSearchInput(true);
        }
      } catch (error) {
        console.error("❌ Error al sincronizar el practice:", error);
      }
    }, delayMs);
  }

  _isPracticeInputSynced(practice) {
    const input = this.template.querySelector("c-practice-search-input");
    return Boolean(
      input &&
      input.selectedPracticeId === practice.Id &&
      input.searchKey === practice.Name
    );
  }

  _clearPracticeState({
    resetManualOverride = false,
    notifyFlow = false,
    syncChild = false
  } = {}) {
    this._isInternalPracticeMutation = true;
    this._practiceId = null;
    this._practiceRecord = null;
    this._lastResolvedPracticeId = null;
    this._lastResolvedPracticeRecordId = null;
    this.showSuggestedPracticeHelper = false;

    if (resetManualOverride) {
      this.hasManualPracticeOverride = false;
      this._selectionSource = null;
    }

    this._isInternalPracticeMutation = false;

    if (syncChild) {
      const input = this.template.querySelector("c-practice-search-input");
      if (input && typeof input.clearSelectedPractice === "function") {
        input.clearSelectedPractice();
      }
    }

    if (notifyFlow) {
      this._dispatchPracticeFlowChanges();
    }
  }

  _dispatchPracticeFlowChanges() {
    this.dispatchEvent(
      new FlowAttributeChangeEvent("practiceRecord", this._practiceRecord)
    );
    this.dispatchEvent(
      new FlowAttributeChangeEvent("practiceId", this._practiceId)
    );
  }

  _showProviderAutoFillToast(practice) {
    const message = "Practice autocompletion from the provider";
    const toastKey = `${practice.Id}:${message}`;
    const now = Date.now();

    if (
      this._lastAutoFillToastKey === toastKey &&
      now - this._lastAutoFillToastAt < 1000
    ) {
      return;
    }

    this._lastAutoFillToastKey = toastKey;
    this._lastAutoFillToastAt = now;

    this.dispatchEvent(
      new ShowToastEvent({
        title: "Practice Selected",
        message,
        variant: "success"
      })
    );
  }

  _showPracticeCreatedToast(practice) {
    if (!practice?.Id || !practice?.Name) {
      return;
    }

    const title = "Practice Created:";
    const message = `"${practice.Name}"`;
    const toastKey = `${practice.Id}:${title}:${message}`;
    const now = Date.now();

    if (
      this._lastCreatedToastKey === toastKey &&
      now - this._lastCreatedToastAt < 1000
    ) {
      return;
    }

    this._lastCreatedToastKey = toastKey;
    this._lastCreatedToastAt = now;

    this.dispatchEvent(
      new ShowToastEvent({
        title,
        message,
        variant: "success"
      })
    );
  }

  _getAccountIdFromUrl() {
    try {
      const href = window.location.href;
      const directMatch = href.match(/\/Account\/([a-zA-Z0-9]{15,18})/);
      if (directMatch) {
        return directMatch[1];
      }
      const params = new URL(href).searchParams;
      const candidates = [
        params.get("recordId"),
        params.get("c__recordId"),
        params.get("c__contextId"),
        params.get("c__accountId")
      ].filter((val) => val);
      for (const val of candidates) {
        if (typeof val === "string" && val.startsWith("001")) {
          return val;
        }
      }
      const hashIndex = href.indexOf("#");
      if (hashIndex !== -1) {
        const hash = href.slice(hashIndex + 1);
        const hashParams = new URLSearchParams(
          hash.includes("?") ? hash.split("?")[1] : hash
        );
        const hashCandidates = [
          hashParams.get("recordId"),
          hashParams.get("c__recordId"),
          hashParams.get("c__contextId"),
          hashParams.get("c__accountId")
        ].filter((val) => val);
        for (const val of hashCandidates) {
          if (typeof val === "string" && val.startsWith("001")) {
            return val;
          }
        }
      }
      return null;
    } catch (error) {
      return null;
    }
  }
}