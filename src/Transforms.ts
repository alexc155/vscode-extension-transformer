'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import { Lines, Modify, Region, View } from './common/EditorFunctions';
import * as MacroBuilder from './macros/MacroBuilder';
import * as md5 from 'md5';
const split = require('split-string');

const gutterDecorationType = vscode.window.createTextEditorDecorationType({
  rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed,
});

let transformInstance = 0;
function originName(textEditor: vscode.TextEditor) {
  const filename = textEditor.document.fileName;
  transformInstance++;
  return 'transform-' + transformInstance + '-' + path.basename(filename);
}

function linesFromRangesExpandBlockIfEmpty(textEditor: vscode.TextEditor, ranges: Array<vscode.Range>) {
  if (ranges.length === 1) {
    ranges[0] = Region.expandRangeToBlockIfEmpty(textEditor, ranges[0]);
  }
  return Lines.linesFromRanges(textEditor.document, ranges);
}

export function sortLines(textEditor: vscode.TextEditor, ranges: Array<vscode.Range>) {
  if (ranges.length === 1 && !ranges[0].isSingleLine) Modify.sortLinesWithinRange(textEditor, ranges[0]);
  else {
    ranges = Region.makeVerticalRangesWithinBlock(textEditor, ranges);
    textEditor.selections = Region.makeSelectionsFromRanges(ranges);
    Modify.sortLinesByColumn(textEditor, ranges);
  }
}

export function sortSelections(textEditor: vscode.TextEditor, ranges: Array<vscode.Range>) {
  Modify.sortRanges(textEditor, ranges);
}

export function randomizeLines(textEditor: vscode.TextEditor, range: vscode.Range) {
  const lines = Lines.linesFromRange(textEditor.document, range);
  const randomLines = lines.slice(0, lines.length);
  const randomizedLines = randomize(randomLines);
  Modify.replaceLines(textEditor, lines, randomizedLines);
}

export function randomizeSelections(textEditor: vscode.TextEditor, ranges: Array<vscode.Range>) {
  const randomizedRanges = randomize([...ranges]);
  Modify.replaceRanges(textEditor, ranges, randomizedRanges);
}

function randomize(items: Array<any>) {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

export function reverseSelections(textEditor: vscode.TextEditor, ranges: Array<vscode.Range>) {
  const orderedRanges = Region.makeOrderedRangesByStartPosition(ranges);
  const reversedRanges = [...orderedRanges].reverse();
  Modify.replaceRanges(textEditor, orderedRanges, reversedRanges);
}

export function sortLinesByLength(textEditor: vscode.TextEditor, ranges: Array<vscode.Range>) {
  const linesToSort = linesFromRangesExpandBlockIfEmpty(textEditor, ranges);
  Modify.sortLinesByLength(textEditor, linesToSort);
}

export function trimLines(textEditor: vscode.TextEditor, ranges: Array<vscode.Range>) {
  let trimmedResult = '';
  const trimLinesB = Lines.linesFromRange(textEditor.document, ranges[0]);
  for (const line of trimLinesB) {
    trimmedResult += line.text.trim() + Lines.lineEndChars(textEditor);
  }
  Modify.replace(textEditor, ranges[0], trimmedResult);
}

export function trimSelections(textEditor: vscode.TextEditor, ranges: Array<vscode.Range>) {
  let trimmedResult = [];
  for (const range of ranges) {
    trimmedResult.push(textEditor.document.getText(range).trim());
  }
  Modify.replaceRangesWithText(textEditor, ranges, trimmedResult);
}

export function uniqueLines(textEditor: vscode.TextEditor, ranges: Array<vscode.Range>) {
  if (ranges.length === 1) {
    const rangeBlock = Region.expandRangeToBlockIfEmpty(textEditor, ranges[0]);
    const lines = Lines.linesFromRange(textEditor.document, rangeBlock);
    const uniqueMep = new Map();
    lines.forEach((line) => {
      uniqueMep.set(line.text, line);
    });

    const uniqueLines = uniqueMep.values();
    const linesArray = Array.from(uniqueLines);
    Modify.replace(textEditor, rangeBlock, Lines.textFromLines(textEditor.document, linesArray));
  }
}

export function uniqueLinesToNewDocument(textEditor: vscode.TextEditor, ranges: Array<vscode.Range>) {
  const lines = linesFromRangesExpandBlockIfEmpty(textEditor, ranges);
  const uniqueMap = new Map();
  lines.forEach((line) => {
    uniqueMap.set(line.text, line);
  });

  const uniqueLines = uniqueMap.values();
  const linesArray = Array.from(uniqueLines);
  View.openShowDocument(originName(textEditor), Lines.textFromLines(textEditor.document, linesArray));
}

export function countUniqueLinesToNewDocument(textEditor: vscode.TextEditor, ranges: Array<vscode.Range>) {
  const lines = linesFromRangesExpandBlockIfEmpty(textEditor, ranges);
  const duplicateNumbers = 0;
  const countMap = new Map();
  const uniqueMap = new Map();
  lines.forEach((line) => {
    uniqueMap.set(line.text, line);
    let count = countMap.get(line.text);
    if (!count) count = 0;
    countMap.set(line.text, count + 1);
  });

  const uniqueLines = uniqueMap.values();
  const linesArray = Array.from(uniqueLines);
  let displayText = '';
  for (let line of linesArray) {
    displayText += countMap.get(line.text) + ' ' + ':' + ' ' + line.text + '\n';
  }
  View.openShowDocument(originName(textEditor), displayText);
}

export function filterLines(textEditor: vscode.TextEditor, selection: vscode.Selection) {
  const selectedText = Lines.textOfLineSelectionOrWordAtCursor(textEditor.document, selection);
  // If we have multiple lines selected, use that as source to filter, else the entire document
  const range = selection.isSingleLine ? Region.makeRangeDocument(textEditor.document) : selection;

  let filteredLines = [];
  return View.promptForFilterExpression(selectedText).then((fnFilter) => {
    filteredLines = Lines.filterLines(textEditor.document, range, fnFilter);
    const content = filteredLines.map((line) => line.text).reduce((prev, curr) => prev + '\n' + curr);
    Modify.replace(textEditor, range, content);
  });
}

export function filterLinesToNewDocument(textEditor: vscode.TextEditor, selection: vscode.Selection) {
  const selectedText = Lines.textOfLineSelectionOrWordAtCursor(textEditor.document, selection);
  // If we have multiple lines selected, use that as source to filter, else the entire document
  const range = selection.isSingleLine ? Region.makeRangeDocument(textEditor.document) : selection;

  const editorName = originName(textEditor);

  return View.promptForFilterExpression(selectedText).then((fnFilter) => {
    const filteredLines = Lines.filterLines(textEditor.document, range, fnFilter);
    return openShowDocumentWithLines(editorName, filteredLines);
  });
}

type FilterContextOptions = {
  sectionByLevel?: number;
  sectionByLevelRegex?: RegExp;
  surroundingLines?: number;
  surroundingRegex?: RegExp;
};

function parseNumberAndRegex(value: string) {
  if (!value) return { number: NaN, regex: null };
  const parts = value.split(' ', 2);
  if (parts.length === 1) return { number: +value, regex: null };
  return { number: +parts[0], regex: new RegExp(parts[1], 'i') };
}

function isFilterContextOptionSet(options: FilterContextOptions) {
  return !isNaN(options.sectionByLevel) || !isNaN(options.surroundingLines);
}

/**
 * TODO
 * - add option for number of surrounding context lines (+linesUp/-linesDown)[numberLines] [optional regex]
 * - add option to include [levels from current] [regex]
 * - add option to include line numbers, original matches vs context matches.
 * - add a new picker to set all these options
 *
 * @param textEditor
 * @param selection
 */
export function filterLinesWithContextToNewDocument(textEditor: vscode.TextEditor, selection: vscode.Selection) {
  const selectedText = Lines.textOfLineSelectionOrWordAtCursor(textEditor.document, selection);
  // If we have multiple lines selected, use that as source to filter, else the entire document
  const range = selection.isSingleLine ? Region.makeRangeDocument(textEditor.document) : selection;

  const editorName = originName(textEditor);

  const regexOption = View.makeOption({
    label: 'Filter',
    description: 'specify filter to select lines',
    value: selectedText,
    input: { prompt: 'Enter regex or [space] + literal', placeHolder: 'abc.*' },
  });
  const surroundOption = View.makeOption({
    label: 'Surrounding Lines',
    description: 'add nearby lines',
    input: { prompt: '[# lines] [optional regex]', placeHolder: '2 abc.*' },
  });
  const levelsOption = View.makeOption({
    label: 'Parent Levels',
    description: 'add lines by relative section level',
    input: { prompt: '[# parent levels] [optional regex]', placeHolder: '2 abc.*' },
  });
  // TODO
  //const lineNumbersOption  = edit.makeOption({label: 'Line Numbers', description: 'include line numbers in output', value: false})
  View.promptOptions(
    [
      regexOption,
      surroundOption,
      levelsOption,
      //lineNumbersOption
    ],
    (item, action) => {
      if (View.QuickPickActionType.INPUT == action) {
        // don't process realtime input changes on large documents
        if (range.end.line - range.start.line > 10000) return;
      }
      const contextOptions: FilterContextOptions = {
        surroundingLines: parseNumberAndRegex(surroundOption.value).number,
        surroundingRegex: parseNumberAndRegex(surroundOption.value).regex,
        sectionByLevel: parseNumberAndRegex(levelsOption.value).number,
        sectionByLevelRegex: parseNumberAndRegex(levelsOption.value).regex,
      };

      const startTime = new Date().getMilliseconds();
      const fnFilter = View.makeFilterFunction(regexOption.value);
      let filteredLines = Lines.filterLines(textEditor.document, range, fnFilter);
      // TODO need to optimize the following for large documents
      if (isFilterContextOptionSet(contextOptions)) {
        filteredLines = filteredLines
          .map((line) => addContextLines(textEditor, line, contextOptions))
          .reduce((prevLines, currLines) => prevLines.concat(currLines))
          .sort((l1, l2) => l1.lineNumber - l2.lineNumber)
          .reduce((a, b) => {
            // remove duplicates
            if (!a.find((a) => a.lineNumber === b.lineNumber)) a.push(b);
            return a;
          }, [] as vscode.TextLine[]);
      }

      //console.log('changed', item?item.label:'', action, (new Date().getMilliseconds()) - startTime)
      openShowDocumentWithLines(editorName, filteredLines);
    }
  );
}

function addContextLines(textEditor: vscode.TextEditor, line: vscode.TextLine, options: FilterContextOptions) {
  const tabSize = +textEditor.options.tabSize;
  let addedContextLines: vscode.TextLine[] = [];

  if (!isNaN(options.sectionByLevel)) {
    const range = Region.makeRangeFromFoldingRegionRelativeLevel(
      textEditor.document,
      line.lineNumber,
      options.sectionByLevel,
      tabSize
    );
    let lines = Lines.linesFromRange(textEditor.document, range);
    if (options.sectionByLevelRegex) lines = lines.filter((line) => options.sectionByLevelRegex.test(line.text));
    addedContextLines = addedContextLines.concat(lines);
  }

  if (options.surroundingLines) {
    let lines = Lines.collectLines(
      textEditor.document,
      Math.max(0, line.lineNumber - options.surroundingLines),
      Math.min(textEditor.document.lineCount, line.lineNumber + options.surroundingLines)
    );
    if (options.surroundingRegex) lines = lines.filter((line) => options.surroundingRegex.test(line.text));
    addedContextLines = addedContextLines.concat(lines);
  }

  // include the original filtered line
  addedContextLines.push(line);
  return addedContextLines;
}

function openShowDocumentWithLines(editorName: string, filteredLines: vscode.TextLine[]) {
  let content = '';
  if (filteredLines.length) content = filteredLines.map((line) => line.text).reduce((prev, curr) => prev + '\n' + curr);
  return View.openShowDocument(editorName, content).then((editor) => {
    if (filteredLines.length < 1000) {
      const decorations = filteredLines.map((line, index) =>
        View.createGutterDecorator(index, ': ' + (line.lineNumber + 1), '50px')
      );
      editor.setDecorations(gutterDecorationType, decorations);
    } else {
      editor.setDecorations(gutterDecorationType, []);
    }
    return editor;
  });
}

export function macroCreate() {
  return MacroBuilder.createMacro();
}

export function macroDelete() {
  return MacroBuilder.deleteMacro();
}
export function macroEdit() {
  return MacroBuilder.editMacro();
}

export function macroRun() {
  return MacroBuilder.runMacro();
}

export function macroRepeatLast() {
  MacroBuilder.runCurrentMacro();
}

export function alignToCursor(textEditor: vscode.TextEditor, ranges: Array<vscode.Range>) {
  ranges = Region.makeVerticalRangesWithinBlock(textEditor, ranges);
  textEditor.selections = Region.makeSelectionsFromRanges(ranges);
  const lineInfos = Lines.makeLineInfos(textEditor, ranges);
  textEditor.edit(function (editBuilder) {
    lineInfos.forEach((line) => {
      const lineLeftOfCursor = line.line.text.substring(0, line.range.start.character);
      const trimmedRight = line.line.text.substring(line.range.start.character).trim();

      editBuilder.replace(
        Region.expandRangeFullLineWidth(textEditor.document, line.range),
        lineLeftOfCursor + trimmedRight
      );
    });
  });
}

export async function alignCSV(textEditor: vscode.TextEditor, ranges: Array<vscode.Range>) {
  const userInput = await vscode.window.showInputBox({ prompt: 'Specify Delimiter', value: ',' });
  const delimeter = JSON.parse('"' + userInput + '"');
  const lines = linesFromRangesExpandBlockIfEmpty(textEditor, ranges);
  const linesParts = lines.map((line) => split(line.text, { separator: delimeter, quotes: true }));
  const newLineTexts: string[] = [];
  const linePartCount = linesParts[0].length;
  for (let columnIndex = 0; columnIndex < linePartCount; columnIndex++) {
    const max = maxLength(linesParts, 0);
    appendColumn(newLineTexts, linesParts, max);
    if (columnIndex != linePartCount - 1) appendDelimeter(newLineTexts, delimeter);
  }

  Modify.replaceLinesWithText(textEditor, lines, newLineTexts);
}

function appendColumn(lines: string[], linesParts: string[][], max: number) {
  for (let linePartIndex = 0; linePartIndex < linesParts.length; linePartIndex++) {
    const part = padRight(linesParts[linePartIndex].shift(), max);

    if (lines[linePartIndex] == undefined) lines[linePartIndex] = '';
    lines[linePartIndex] += part;
  }
}

function appendDelimeter(lines: string[], delimeter: string) {
  for (let linePartIndex = 0; linePartIndex < lines.length; linePartIndex++) {
    lines[linePartIndex] = lines[linePartIndex] + delimeter;
  }
}

function padRight(text: string, count: number) {
  const padAmount = count - text.length;
  return text + ' '.repeat(padAmount + 1);
}

function maxLength(texts: string[][], partIndex: number) {
  let max = 0;
  return texts
    .map((text) => text[partIndex].length)
    .reduce((prev, curr) => {
      return curr >= prev ? curr : prev;
    });
}

export async function compactCSV(textEditor: vscode.TextEditor, ranges: Array<vscode.Range>) {
  const userInput = await vscode.window.showInputBox({ prompt: 'Specify Delimiter', value: ',' });

  const delimeter = JSON.parse('"' + userInput + '"');
  const lines = linesFromRangesExpandBlockIfEmpty(textEditor, ranges);
  const linesParts = lines.map((line) => split(line.text, { separator: delimeter, quotes: true }));
  const newLineTexts: string[] = [];
  const linePartCount = linesParts[0].length;
  for (let columnIndex = 0; columnIndex < linePartCount; columnIndex++) {
    const max = maxLength(linesParts, 0);
    compactColumn(newLineTexts, linesParts, max);
    if (columnIndex != linePartCount - 1) appendDelimeter(newLineTexts, delimeter);
  }

  Modify.replaceLinesWithText(textEditor, lines, newLineTexts);
}

function compactColumn(lines: string[], linesParts: string[][], max: number) {
  for (let linePartIndex = 0; linePartIndex < linesParts.length; linePartIndex++) {
    const part = linesParts[linePartIndex].shift().trim();

    if (lines[linePartIndex] == undefined) lines[linePartIndex] = '';
    lines[linePartIndex] += part;
  }
}

export function copyToNewDocument(textEditor: vscode.TextEditor) {
  Region.selectionsOrMatchesAsSelectionsOrDocument(textEditor).then((selections) => {
    const textFromSelections = Region.textsFromRanges(textEditor.document, selections);
    View.openShowDocument(originName(textEditor), textFromSelections.join('\n'));
  });
}

export function selectLines(textEditor: vscode.TextEditor) {
  Region.matchesAsSelectionsOrSelections(textEditor).then((selections) => {
    textEditor.selections = selections.map((selection) => {
      const range = Region.expandRangeFullLineWidth(textEditor.document, selection);
      return new vscode.Selection(range.start, range.end);
    });
  });
}

export async function selectHighlights() {
  await vscode.commands.executeCommand('editor.action.selectHighlights');
}

export function linesAsJSON(textEditor: vscode.TextEditor) {
  const lines = Lines.linesFromRange(textEditor.document, textEditor.selection);
  const jsonLines = lines.map((line) => JSON.stringify(line.text) + ',');
  Modify.replaceLinesWithText(textEditor, lines, jsonLines);
}

export function selectionAsJSON(textEditor: vscode.TextEditor) {
  const expandedSelections = Region.expandRangesToLineIfEmpty(textEditor.document, textEditor.selections);
  Modify.replaceUsingTransform(textEditor, expandedSelections, (text) => JSON.stringify(text));
}

export function jsonStringAsText(textEditor: vscode.TextEditor) {
  const expandedSelections = Region.expandRangesToLineIfEmpty(textEditor.document, textEditor.selections);
  Modify.replaceUsingTransform(textEditor, expandedSelections, (text) => JSON.parse(text));
}

export async function joinLines(textEditor: vscode.TextEditor) {
  const userInput = await vscode.window.showInputBox({ prompt: 'Specify Delimiter', value: '' });
  const splitChar = Lines.lineEndChars(textEditor);
  Modify.replaceUsingTransform(textEditor, textEditor.selections, (text) => text.split(splitChar).join(userInput));
}

export async function splitLines(textEditor: vscode.TextEditor) {
  const userInput = await vscode.window.showInputBox({ prompt: 'Specify Delimiter', value: '' });
  const splitChar = Lines.lineEndChars(textEditor);
  const expandedSelections = Region.expandRangesToLineIfEmpty(textEditor.document, textEditor.selections);
  Modify.replaceUsingTransform(textEditor, expandedSelections, (text) => text.split(userInput).join(splitChar));
}

export async function splitLinesBeforeDelimiter(textEditor: vscode.TextEditor) {
  const userInput = await vscode.window.showInputBox({ prompt: 'Specify Delimiter', value: '' });
  const splitChar = Lines.lineEndChars(textEditor) + userInput;
  const expandedSelections = Region.expandRangesToLineIfEmpty(textEditor.document, textEditor.selections);
  Modify.replaceUsingTransform(textEditor, expandedSelections, (text) => text.split(userInput).join(splitChar));
}

export async function splitLinesAfterDelimiter(textEditor: vscode.TextEditor) {
  const userInput = await vscode.window.showInputBox({ prompt: 'Specify Delimiter', value: '' });
  const splitChar = userInput + Lines.lineEndChars(textEditor);
  const expandedSelections = Region.expandRangesToLineIfEmpty(textEditor.document, textEditor.selections);
  Modify.replaceUsingTransform(textEditor, expandedSelections, (text) => text.split(userInput).join(splitChar));
}

export async function rotateForwardSelections(textEditor: vscode.TextEditor) {
  const ranges = textEditor.selections;
  const orderedRanges = Region.makeOrderedRangesByStartPosition(ranges);
  let shiftedRanges = [...orderedRanges];
  shiftedRanges.unshift(shiftedRanges.pop());
  Modify.replaceRanges(textEditor, orderedRanges, shiftedRanges);
}

export async function rotateBackwardSelections(textEditor: vscode.TextEditor) {
  const ranges = textEditor.selections;
  const orderedRanges = Region.makeOrderedRangesByStartPosition(ranges);
  let shiftedRanges = [...orderedRanges];
  shiftedRanges.push(shiftedRanges.shift());
  Modify.replaceRanges(textEditor, orderedRanges, shiftedRanges);
}

export async function normalizeDiacriticalMarks(textEditor: vscode.TextEditor) {
  const ranges = textEditor.selections;
  const orderedRanges = Region.makeOrderedRangesByStartPosition(ranges);

  const normalizedText = [];
  for (const range of orderedRanges) {
    const text = normalizeDiacritical(textEditor.document.getText(range));
    normalizedText.push(text);
  }
  Modify.replaceRangesWithText(textEditor, orderedRanges, normalizedText);
}

function normalizeDiacritical(text: String) {
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export async function loremIpsum(textEditor: vscode.TextEditor) {
  const position = textEditor.selection.start;

  Modify.add(
    textEditor,
    position,
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis maximus malesuada consectetur. Fusce sed interdum massa. Duis dictum lectus et quam fringilla ornare. Quisque facilisis id ex vel eleifend. Curabitur commodo nunc at nunc maximus molestie. Donec interdum erat enim, eget rhoncus nisl tristique et. Interdum et malesuada fames ac ante ipsum primis in faucibus. Sed in augue pharetra, imperdiet odio in, aliquam urna. Integer rutrum nisi sit amet magna lobortis suscipit. Curabitur pulvinar rutrum orci, vitae vulputate sem tempus quis. Morbi scelerisque dolor ex. Vivamus lacinia, tellus nec sodales gravida, diam urna tempor risus, id imperdiet est nisi at mi. Cras tincidunt lorem id ante molestie, quis eleifend elit sodales. Mauris aliquet arcu bibendum nisl efficitur, vel vestibulum quam bibendum. Vivamus placerat nec nulla pretium consequat. Quisque eu lorem bibendum, tincidunt velit in, venenatis risus.'
  );
}

export async function convertToMarkdownTable(textEditor: vscode.TextEditor) {
  if (textEditor.document.getText(textEditor.selection).length > 0) {
    textEditor.edit((editBuilder) => {
      editBuilder.replace(
        textEditor.selection,
        convertTextToMarkdownTable(textEditor.document.getText(textEditor.selection))
      );
    });
  } else {
    textEditor.edit((editBuilder) => {
      editBuilder.replace(
        Region.makeRangeDocument(textEditor.document),
        convertTextToMarkdownTable(textEditor.document.getText())
      );
    });
  }
}

function convertTextToMarkdownTable(input: string) {
  const list = input
    .trim()
    .replace(/^(\r?\n)+$/g, '\n')
    .split('\n')
    .map((v) => v.replace(/^\||\|$/g, ''));
  const delimiter = [`|`, `\t`, `","`, `,`].find((v) => list[0].split(v).length > 1);
  if (delimiter === `|`) {
    // If input text is markdown table format, removes header separator.
    list.splice(1, 1);
  }
  const tableElements = list.map((record) => record.split(delimiter).map((v) => v.trim()));
  const calcBytes = (character) => {
    let length = 0;
    for (let i = 0; i < character.length; i++) {
      const c = character.charCodeAt(i);
      // Multibyte handling
      (c >= 0x0 && c < 0x81) || c === 0xf8f0 || (c >= 0xff61 && c < 0xffa0) || (c >= 0xf8f1 && c < 0xf8f4)
        ? (length += 1)
        : (length += 2);
    }
    return length;
  };
  const columnMaxLengthList = tableElements[0]
    .map((v, i) => i)
    .reduce((map, columnIndex) => {
      let maxLength = 0;
      tableElements.forEach((record) =>
        maxLength < calcBytes(record[columnIndex]) ? (maxLength = calcBytes(record[columnIndex])) : null
      );
      if (maxLength === 1) {
        // Avoids markdown header line becomes only ":" ( ":-" is correct. ).
        maxLength = 2;
      }
      map[columnIndex] = maxLength;
      return map;
    }, {});
  const formattedTableElements = tableElements.map((record) =>
    record.map((value, columnIndex) => value + ''.padEnd(columnMaxLengthList[columnIndex] - calcBytes(value), ' '))
  );
  const headerValues = formattedTableElements.shift();
  const tableLine = headerValues.map((v) => ''.padStart(calcBytes(v), '-').replace(/^./, ':'));
  formattedTableElements.unshift(tableLine);
  formattedTableElements.unshift(headerValues);
  return formattedTableElements.map((record) => '| ' + record.join(' | ') + ' |').join('\n');
}

export async function showSnippets(textEditor: vscode.TextEditor) {
  const position = textEditor.selection.start;

  const snippets = [
    {
      key: 'TERMINAL',
      value: `export PS1="\\n\\[\\033[33;1m\\]\\w\\[\\033[m\\]\\n\\$ "`,
    },
    {
      key: 'TEAMCITY',
      value: `tc_username=teamcity3 tc_password=Dk05q7a06w`,
    },
    {
      key: 'sleep',
      value: `const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));`,
    },
    {
      key: 'npm-shrinkwrap.json',
      value: `    {
      "dependencies": {
        "graceful-fs": {
            "version": "4.2.2"
         }
      }
    }`,
    },
    {
      key: 'fiddler web config',
      value: `  <system.net>
    <defaultProxy enabled="true">
      <proxy bypassonlocal="False" usesystemdefault="True" />
      <!--<proxy proxyaddress="http://127.0.0.1:8888" bypassonlocal="False" />-->  
    </defaultProxy>
  </system.net>`,
    },
  ];

  Modify.add(textEditor, position, snippets.map((x) => `${x.key}:\t${x.value}`).join('\n\n'));
}

export function escapes(textEditor: vscode.TextEditor) {
  const selections = Region.expandRangesToLineIfEmpty(textEditor.document, textEditor.selections);

  const encodeBase64 = View.makeOption({ label: 'Encode Base64', description: 'encode as base64' });
  const decodeBase64 = View.makeOption({ label: 'Decode Base64', description: 'decode from base64' });
  const encodeUrlSegment = View.makeOption({
    label: 'Encode URL Segment',
    description: 'encode using encodeURIComponent()',
  });
  const decodeUrlSegment = View.makeOption({
    label: 'Decode URL Segment',
    description: 'decode using decodeURIComponent()',
  });
  const encodeFormUrl = View.makeOption({
    label: 'Encode x-www-form-urlencoded,',
    description: `form url encoding with spaces as '+'`,
  });
  const decodeFormUrl = View.makeOption({
    label: 'Decode x-www-form-urlencoded,',
    description: `form url decoding with spaces as '+'`,
  });
  const encodeMD5 = View.makeOption({ label: 'Hash MD5', description: 'calculate MD5 Hash' });

  View.promptOptions(
    [encodeBase64, decodeBase64, encodeUrlSegment, decodeUrlSegment, encodeFormUrl, decodeFormUrl, encodeMD5],
    (item, action) => {
      if (encodeBase64 === item) {
        Modify.replaceUsingTransform(textEditor, selections, (text) => Buffer.from(text, 'binary').toString('base64'));
      } else if (decodeBase64 === item) {
        Modify.replaceUsingTransform(textEditor, selections, (text) => Buffer.from(text, 'base64').toString('binary'));
      } else if (encodeMD5 === item) {
        Modify.replaceUsingTransform(textEditor, selections, (text) => md5(text));
      } else if (encodeUrlSegment === item) {
        Modify.replaceUsingTransform(textEditor, selections, (text) => encodeURIComponent(text));
      } else if (decodeUrlSegment === item) {
        Modify.replaceUsingTransform(textEditor, selections, (text) => decodeURIComponent(text));
      } else if (encodeFormUrl === item) {
        Modify.replaceUsingTransform(textEditor, selections, (text) => encodeURIComponent(text).replace(/\%20/g, '+'));
      } else if (decodeFormUrl === item) {
        Modify.replaceUsingTransform(textEditor, selections, (text) => decodeURIComponent(text.replace(/\+/g, '%20')));
      }
    }
  );
}
