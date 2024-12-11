import {Component, Input} from '@angular/core';

@Component({
  selector: 'app-instruction-cover',
  standalone: true,
  imports: [],
  templateUrl: './instruction-cover.component.html',
  styleUrl: './instruction-cover.component.sass'
})
export class InstructionCoverComponent {
  @Input()
  mocName?: string = "";
  @Input()
  scale?: string = "";
  @Input()
  version?: string = "";
  @Input()
  fileName?: string = "";
  @Input()
  authors?: string = "";
}
