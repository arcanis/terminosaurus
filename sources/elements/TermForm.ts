import {TermElement} from '../dom/TermElement';
import {EventSlot}   from '../misc/EventSource';

export class TermForm extends TermElement {
  public onSubmit = new EventSlot(this as TermForm, `onSubmit`, {});
}
