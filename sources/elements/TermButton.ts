import {findAncestorByPredicate} from '../dom/traverse';
import {TermForm}                from '../elements/TermForm';
import {TermText}                from '../elements/TermText';
import {color, StyleValues}      from '../index';
import {makeRuleset}             from '../style/tools/makeRuleset';

const ruleset = makeRuleset({
  [`*`]: {
    focusEvents: true,
  },
  [`:decorated:hover`]: {
    borderColor: color(`white`),
    color: color(`white`),

    textDecoration: StyleValues.TextDecoration.Underline,
  },
  [`:decorated:active`]: {
    backgroundClip: StyleValues.BackgroundClip.PaddingBox,
    backgroundColor: color(`white`),

    color: color(`black`),

    textDecoration: null,
  },
});

export class TermButton extends TermText {
  public doesSubmit = true;

  constructor() {
    super();

    this.caret = null;
    this.readOnly = true;

    this.styleManager.addRuleset(ruleset);

    const submitForm = () => {
      const form = findAncestorByPredicate(this, (node): node is TermForm => node instanceof TermForm);
      if (!form)
        return;

      form.onSubmit.dispatchEvent({});
    };

    this.onClick.addEventListener(e => {
      if (!this.doesSubmit)
        return;

      e.action = () => {
        submitForm();
      };
    }, {capture: true});

    this.addShortcutListener(`enter`, e => {
      if (!this.doesSubmit)
        return;

      e.action = () => {
        submitForm();
      };
    }, {capture: true});
  }
}
