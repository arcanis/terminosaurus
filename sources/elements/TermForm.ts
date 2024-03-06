import {TermElement} from '#sources/dom/TermElement';
import {EventSlot}   from '#sources/misc/EventSource';

export class TermForm extends TermElement {
  public onSubmit = new EventSlot(this as TermForm, `onSubmit`, {});
}
