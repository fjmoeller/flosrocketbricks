import {Component, EventEmitter, Inject, Input, OnInit, Output, PLATFORM_ID} from '@angular/core';
import {FormsModule, ReactiveFormsModule} from "@angular/forms";
import {isPlatformBrowser, NgClass} from "@angular/common";

@Component({
  selector: 'app-select',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    NgClass,
    FormsModule
  ],
  templateUrl: './select.component.html',
  styleUrl: './select.component.sass'
})
export class SelectComponent implements OnInit {

  @Output() optionSelectedEvent = new EventEmitter<{ value: string, label: string }>();

  _selectOptions: { value: string, label: string }[] = [];
  @Input() set selectOptions(options: { value: string, label: string }[]) {
    this._selectOptions = options;
    this.selectedOption = this._selectOptions.find(o => o.value === this._selectedOptionDefault);
    this.searchTextChanged();
  }

  _selectedOptionDefault: string = "";
  @Input() set selectedOptionDefault(value: string) {
    this._selectedOptionDefault = value;
    this.selectedOption = this._selectOptions.find(o => o.value === value);
    this.searchTextChanged();
  }

  selectedOption: { value: string, label: string } | undefined = undefined;
  searchText = "";
  filteredSelectOption: { value: string, label: string }[] = [];

  constructor(@Inject(PLATFORM_ID) private platformId: any) {
  }

  ngOnInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      document.addEventListener('click', (event) => {
        const optionContainer = document.getElementById("inputOptions");
        if (event.target instanceof Node && optionContainer && !optionContainer.contains(event.target)) {
          this.setOptionsInvisible();
        }
      });
      document.getElementById("selectText")?.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        this.toggleOptionsVisible();
      });
    }
  }

  searchTextChanged():void{
    this.filteredSelectOption = this._selectOptions.filter(option => option.label.toLowerCase().includes(this.searchText.toLowerCase()));
  }

  optionSelected(selectedOption: { value: string, label: string }): void {
    this.selectedOption = selectedOption;
    this.optionSelectedEvent.emit(selectedOption);
  }

  toggleOptionsVisible(): void {
    if(document.getElementById("inputOptions")?.classList.contains("hidden")){
      this.setOptionsVisible();
    }else{
      this.setOptionsInvisible();
    }
  }

  setOptionsVisible() {
    document.getElementById("inputOptions")?.classList.remove("hidden");
  }

  setOptionsInvisible() {
    document.getElementById("inputOptions")?.classList.add("hidden");
  }
}
