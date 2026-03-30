import { LightningElement, api } from "lwc";
import { FlowAttributeChangeEvent } from "lightning/flowSupport";

export default class ProviderinCaseFlow extends LightningElement {
  @api isFromFlow;
  @api recordId;
  _accountId;
  _accountRecord;
  _suggestedPracticeId;

  @api
  get accountId() {
    return this._accountId;
  }
  set accountId(value) {
    this._accountId = value || null;
  }

  @api
  get accountRecord() {
    return this._accountRecord;
  }
  set accountRecord(value) {
    this._accountRecord = value || null;
  }

  @api
  get suggestedPracticeId() {
    return this._suggestedPracticeId;
  }
  set suggestedPracticeId(value) {
    this._suggestedPracticeId = value || null;
  }

  handleValueChange(event) {
    const { accountId, accountRecord } = event.detail;

    this._accountId = accountId || null;
    this._accountRecord = accountRecord || null;
    this._publishSuggestedPracticeId(this._accountRecord?.practiceid__c);
  }

  handleClearSelection() {
    this._accountId = null;
    this._accountRecord = null;
    this._publishSuggestedPracticeId(null);
  }

  handleInitialPopulate() {
    if (this.accountId) {
      const searchInput = this.template.querySelector("c-account-search-input");
      if (
        searchInput &&
        typeof searchInput.setPreSelectedAccount === "function"
      ) {
        searchInput.setPreSelectedAccount(this.accountId);
      }
    } else {
      this.handleClearSelection();
    }
  }

  @api
  validate() {
    if (this.accountId) {
      return { isValid: true };
    }

    return {
      isValid: false,
      errorMessage: "Please select a provider."
    };
  }

  finishAction = ({ outputVariables }) => {
    const searchInput = this.template.querySelector("c-account-search-input");
    console.log(
      "🎯 outputVariables del Flow:",
      JSON.stringify(outputVariables)
    );

    // eslint-disable-next-line @lwc/lwc/no-async-operation
    setTimeout(() => {
      try {
        let providerRecord = null;
        let practiceRecord = null;

        outputVariables.forEach((outputVar) => {
          if (outputVar.name === "provider" && outputVar.value) {
            providerRecord = outputVar.value;
          }
          if (outputVar.name === "practiceRecordFull" && outputVar.value) {
            practiceRecord = outputVar.value;
          }
        });

        if (providerRecord) {
          this._accountId = providerRecord.Id;
          this._accountRecord = providerRecord;
          this._publishSuggestedPracticeId(providerRecord.practiceid__c);

          if (searchInput && typeof searchInput.addNewAccount === "function") {
            searchInput.addNewAccount(providerRecord);
          }

          this.dispatchEvent(
            new CustomEvent("accountselected", {
              detail: {
                accountId: providerRecord.Id,
                accountRecord: providerRecord
              },
              bubbles: true,
              composed: true
            })
          );

          console.log(
            "✅ Provider agregado correctamente:",
            providerRecord.Name ||
              `${providerRecord.FirstName || ""} ${providerRecord.LastName || ""}`
          );
        } else {
          this._publishSuggestedPracticeId(null);
        }

        if (practiceRecord) {
          const displayName =
            practiceRecord.Name ||
            `${practiceRecord.FirstName || ""} ${practiceRecord.LastName || ""}`.trim();

          window.dispatchEvent(
            new CustomEvent("practiceselected", {
              detail: {
                practiceId: practiceRecord.Id,
                practiceRecord
              }
            })
          );

          console.log("🌐 Practice global event dispatched:", displayName);
        } else {
          console.warn("⚠️ No se encontró practiceRecord en outputVariables");
        }
      } catch (e) {
        console.warn("⚠️ Error controlado en finishAction:", e);
      }
    }, 350);
  };

  _publishSuggestedPracticeId(practiceId) {
    this._suggestedPracticeId = practiceId || null;
    this.dispatchEvent(
      new FlowAttributeChangeEvent(
        "suggestedPracticeId",
        this._suggestedPracticeId
      )
    );
    window.dispatchEvent(
      new CustomEvent("providersuggestedpracticechange", {
        detail: {
          suggestedPracticeId: this._suggestedPracticeId
        }
      })
    );
  }
}