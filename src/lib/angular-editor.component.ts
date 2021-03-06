import {
  AfterContentInit,
  Component,
  EventEmitter,
  forwardRef,
  Input,
  OnInit,
  Output,
  Renderer2,
  ViewChild
} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from "@angular/forms";
import {AngularEditorConfig, angularEditorConfig} from "./config";
import {AngularEditorToolbarComponent} from "./angular-editor-toolbar.component";
import {AngularEditorService} from "./angular-editor.service";

@Component({
  selector: 'angular-editor',
  templateUrl: "./angular-editor.component.html",
  styleUrls: ["./angular-editor.component.scss"],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => AngularEditorComponent),
      multi: true
    }
  ]
})
export class AngularEditorComponent implements OnInit, ControlValueAccessor, AfterContentInit {

  private onChange: (value: string) => void;
  private onTouched: () => void;

  placeholder: boolean;

  modeVisual = true;
  showPlaceholder = false;
  @Input() id = '';
  @Input() config: AngularEditorConfig = angularEditorConfig;

  @Output() html;

  @ViewChild('editor') textArea: any;
  @ViewChild('editorWrapper') editorWrapper: any;
  @ViewChild('editorToolbar') editorToolbar: AngularEditorToolbarComponent;

  @Output() viewMode = new EventEmitter<boolean>();

  constructor(private _renderer: Renderer2, private editorService: AngularEditorService) {
  }

  ngOnInit() {
    this.editorToolbar.id = this.id;
    this.editorService.uploadUrl = this.config.uploadUrl;
    if (this.config.defaultParagraphSeparator) {
      document.execCommand("defaultParagraphSeparator", false, "p");
    }
  }

  ngAfterContentInit() {
    if (this.config.defaultFontName) {
      this.editorToolbar.fontName = this.config.defaultFontName;
      this.onEditorFocus();
      this.editorService.setFontName(this.config.defaultFontName);
    }
    if (this.config.defaultFontSize) {
      this.editorToolbar.fontSize = this.config.defaultFontSize;
      this.onEditorFocus();
      this.editorService.setFontSize(this.config.defaultFontSize);
    }
  }

  /**
   * Executed command from editor header buttons
   * @param command string from triggerCommand
   */
  executeCommand(command: string) {
    if (command === 'toggleEditorMode') {
      this.toggleEditorMode(this.modeVisual);
    } else if (command !== '') {
      this.editorService.executeCommand(command);
      this.exec();
    }

    this.onEditorFocus();
    return;
  }

  onTextAreaBlur() {
    /**
     * save selection if focussed out
     */
    this.editorService.saveSelection();

    if (typeof this.onTouched === 'function') {
      this.onTouched();
    }
    return;
  }

  /**
   *  focus the text area when the editor is focussed
   */
  onEditorFocus() {
    this.textArea.nativeElement.focus();
  }

  /**
   * Executed from the contenteditable section while the input property changes
   * @param html html string from contenteditable
   */
  onContentChange(html: string): void {

    if (typeof this.onChange === 'function') {
      this.onChange(html);
      if ((!html || html === '<br>' || html === '') != this.showPlaceholder) {
        this.togglePlaceholder(this.showPlaceholder);
      }
    }
    return;
  }

  /**
   * Set the function to be called
   * when the control receives a change event.
   *
   * @param fn a function
   */
  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  /**
   * Set the function to be called
   * when the control receives a touch event.
   *
   * @param fn a function
   */
  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  /**
   * Write a new value to the element.
   *
   * @param value value to be executed when there is a change in contenteditable
   */
  writeValue(value: any): void {

    if ((!value || value === '<br>' || value === '') != this.showPlaceholder) {
      this.togglePlaceholder(this.showPlaceholder);
    }

    if (value === null || value === undefined || value === '' || value === '<br>') {
      value = null;
    }

    this.refreshView(value);
  }

  /**
   * refresh view/HTML of the editor
   *
   * @param value html string from the editor
   */
  refreshView(value: string): void {
    const normalizedValue = value === null ? '' : value;
    this._renderer.setProperty(this.textArea.nativeElement, 'innerHTML', normalizedValue);

    return;
  }

  /**
   * toggles placeholder based on input string
   *
   * @param value A HTML string from the editor
   */
  togglePlaceholder(value: boolean): void {
    if (!value) {
      this._renderer.addClass(this.editorWrapper.nativeElement, 'show-placeholder');
      this.showPlaceholder = true;

    } else {
      this._renderer.removeClass(this.editorWrapper.nativeElement, 'show-placeholder');
      this.showPlaceholder = false;
    }
    return;
  }

  /**
   * Implements disabled state for this element
   *
   * @param isDisabled
   */
  setDisabledState(isDisabled: boolean): void {
    const div = this.textArea.nativeElement;
    const action = isDisabled ? 'addClass' : 'removeClass';
    this._renderer[action](div, 'disabled');
  }

  /**
   * toggles editor mode based on bToSource bool
   *
   * @param bToSource A boolean value from the editor
   */
  toggleEditorMode(bToSource: boolean) {
    let oContent: any;
    const editableElement = this.textArea.nativeElement;

    if (bToSource) {
      oContent = document.createTextNode(editableElement.innerHTML);
      editableElement.innerHTML = '';

      const oPre = document.createElement('pre');
      oPre.setAttribute("style", "margin: 0; outline: none;");
      const oCode = document.createElement('code');
      editableElement.contentEditable = false;
      oCode.id = "sourceText";
      oCode.setAttribute("style", "white-space: pre-wrap; word-break: keep-all; margin: 0; outline: none; background-color: #fff5b9;");
      oCode.contentEditable = 'true';
      oCode.appendChild(oContent);
      oPre.appendChild(oCode);
      editableElement.appendChild(oPre);

      document.execCommand("defaultParagraphSeparator", false, "div");

      this.modeVisual = false;
      this.viewMode.emit(false);
      oCode.focus();
    } else {
      if (document.all) {
        editableElement.innerHTML = editableElement.innerText;
      } else {
        oContent = document.createRange();
        oContent.selectNodeContents(editableElement.firstChild);
        editableElement.innerHTML = oContent.toString();
      }
      editableElement.contentEditable = true;
      this.modeVisual = true;
      this.viewMode.emit(true);
      this.onContentChange(editableElement.innerHTML);
      editableElement.focus();
    }
    this.editorToolbar.setEditorMode(!this.modeVisual);
  }

  /**
   * toggles editor buttons when cursor moved or positioning
   *
   * Send a node array from the contentEditable of the editor
   */
  exec() {
    this.editorToolbar.triggerButtons();

    let userSelection;
    if (window.getSelection) {
      userSelection = window.getSelection();
    }

    let a = userSelection.focusNode;
    const els = [];
    while (a && a.id !== 'editor') {
      els.unshift(a);
      a = a.parentNode;
    }
    this.editorToolbar.triggerBlocks(els);
  }

}
