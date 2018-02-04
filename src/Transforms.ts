'use strict';
import * as path from 'path'
import * as vscode from 'vscode';
import * as edit from 'vscode-extension-common'

const gutterDecorationType = vscode.window.createTextEditorDecorationType({
    rangeBehavior: vscode.DecorationRangeBehavior.ClosedClosed
});

function originName(textEditor: vscode.TextEditor) {
    const filename = textEditor.document.fileName
    return 'transform-' + path.basename(filename)
}

function linesFromRangesExpandBlockIfEmpty(textEditor: vscode.TextEditor,ranges: Array<vscode.Range>) {
    if(ranges.length === 1) {
        ranges[0] = edit.expandRangeToBlockIfEmpty(textEditor, ranges[0]);
    }
    return edit.linesFromRanges(textEditor.document, ranges);
}

export function sortLines(textEditor: vscode.TextEditor, ranges: Array<vscode.Range>) {
    if (ranges.length === 1 && !ranges[0].isSingleLine) edit.sortLinesWithinRange(textEditor,  ranges[0]);
    else {
        ranges = edit.makeVerticalRangesWithinBlock(textEditor, ranges);
        textEditor.selections = edit.makeSelectionsFromRanges(ranges);
        edit.sortLinesByColumn(textEditor, ranges);
    } 
}
export function sortLinesByLength(textEditor: vscode.TextEditor, ranges: Array<vscode.Range>) {
    const linesToSort = linesFromRangesExpandBlockIfEmpty(textEditor, ranges);
    edit.sortLinesByLength(textEditor, linesToSort);
}

export function uniqueLines(textEditor: vscode.TextEditor, ranges: Array<vscode.Range>) {
    if(ranges.length === 1) {
        const rangeBlock = edit.expandRangeToBlockIfEmpty(textEditor, ranges[0]);
        const lines = edit.linesFromRange(textEditor.document, rangeBlock);
        const uniqueMep = new Map()
        lines.forEach(line => {
            uniqueMep.set(line.text, line);
        });

        const uniqueLines = uniqueMep.values()
        const linesArray = Array.from(uniqueLines);
        edit.replace(textEditor, rangeBlock, edit.textFromLines(textEditor.document, linesArray));
    }
}

export function uniqueLinesToNewDocument(textEditor: vscode.TextEditor, ranges: Array<vscode.Range>) {
    const lines = linesFromRangesExpandBlockIfEmpty(textEditor, ranges);
    const uniqueMap = new Map()
    lines.forEach(line => {
        uniqueMap.set(line.text, line);
    });

    const uniqueLines = uniqueMap.values()
    const linesArray = Array.from(uniqueLines);
    edit.openShowDocument(originName(textEditor), edit.textFromLines(textEditor.document, linesArray));
}

export function filterLines(textEditor: vscode.TextEditor, selection:vscode.Selection) {
    const selectedText = edit.textOfLineSelectionOrWordAtCursor(textEditor.document, selection);
    // If we have multiple lines selected, use that as source to filter, else the entire document
    const range = selection.isSingleLine ? edit.makeRangeDocument(textEditor.document) : selection;

    let filteredLines = [];
    return edit.promptForFilterExpression(selectedText)
        .then(fnFilter => {
            filteredLines = edit.filterLines(textEditor.document, range, fnFilter);
            const content = filteredLines.map(line => line.text).reduce((prev, curr) => prev + "\n" + curr);
            edit.replace(textEditor, range, content);
        })
}

export function filterLinesToNewDocument(textEditor: vscode.TextEditor, selection:vscode.Selection) {
    const selectedText = edit.textOfLineSelectionOrWordAtCursor(textEditor.document, selection);
    // If we have multiple lines selected, use that as source to filter, else the entire document
    const range = selection.isSingleLine ? edit.makeRangeDocument(textEditor.document) : selection;

    return edit.promptForFilterExpression(selectedText)
        .then(fnFilter => {
            const filteredLines = edit.filterLines(textEditor.document, range, fnFilter);
            return openShowDocumentWithLines(textEditor, filteredLines)
        })
}

function openShowDocumentWithLines(textEditor: vscode.TextEditor, filteredLines) {
    const content = filteredLines.map(line => line.text).reduce((prev, curr) => prev + "\n" + curr);
    return edit.openShowDocument(originName(textEditor), content)
        .then(editor => {
            const decorations = filteredLines.map((line, index) => edit.createGutterDecorator(index, ': ' + (line.lineNumber + 1), '50px'));
            editor.setDecorations(gutterDecorationType, decorations);
            return editor;
        });
}

export function liveTransform(textEditor: vscode.TextEditor, selection:vscode.Selection) {
    const DEFAULT_SCRIPT = "// lines, selections, document\n" +
                           "lines.filter(line=>/./i.test(line))\n" +
                           "     .map(line=>line)\n"

    const FILTER_SEPARATOR = '------------------------------------------------------------------------'

    function filterRange(document:vscode.TextDocument) {
        const lines = edit.linesFromRange(document, edit.makeRangeDocument(document))
        const separatorLine = lines.find(line=>line.text===FILTER_SEPARATOR).lineNumber
        return new vscode.Range(new vscode.Position(0,0), new vscode.Position(separatorLine, 0))
    }

    function extractFilterFromDocument(document:vscode.TextDocument) {
        const range = filterRange(document)
        const filterText = document.getText(filterRange(document)).trim()
        return {filterText, separatorLine: range.end.line + 1}
    }

    function linesFromSourceDocument(document:vscode.TextDocument) {
        const editor = visibleTextEditorFromDocument(document)
        return edit.linesFromRanges(document, editor.selections);
    }

    function filterDocument(document, filter:string) {
        //if (typeof filterFn !== "function") return ''
        const lines = linesFromSourceDocument(document).map(line=>line.text)
        //const filterFn = eval(filter)
        let result = ''
        try {
            result = eval(filter).reduce((prev, curr) => prev + '\n' + curr, '')
        } catch (error) {
            result = error.message
        }
        
        return result;
        // return edit.filterLines(document, edit.makeRangeDocument(document), filterFn)
        //     .map(line => line.text)
        //     .reduce((prev, curr) => prev + '\n' + curr, '')
    }

    function visibleTextEditorFromDocument(document:vscode.TextDocument) {
        return vscode.window.visibleTextEditors.find(editor=>editor.document===document)
    }

    function documentToDocumentTransform(sourceDocument:vscode.TextDocument, targetDocument:vscode.TextDocument) {
        const targetEditor:vscode.TextEditor = visibleTextEditorFromDocument(targetDocument)
        if (!targetEditor) return
        const {filterText, separatorLine} = extractFilterFromDocument(targetDocument)
        const allAfterFirstLine = edit.makeRangeFromLineToEnd(targetDocument, separatorLine)
        edit.replace(targetEditor, allAfterFirstLine, filterDocument(sourceDocument, filterText))
        // reset selection.  Otherwise all replaced text is highlighted in selection
        //targetEditor.selection = new vscode.Selection(new vscode.Position(0,0), new vscode.Position(0,0))
    }

    let lastActiveSourceDocument = vscode.window.activeTextEditor.document
    return edit.openShowDocument('Live-Transform.txt', DEFAULT_SCRIPT + FILTER_SEPARATOR + '\n', false)
        .then(editor => {
            // reset selection.  Otherwise all replaced text is highlighted in selection
            editor.selection = new vscode.Selection(new vscode.Position(1,21), new vscode.Position(1,21))

            const targetDocument = editor.document
            vscode.workspace.onDidChangeTextDocument(event=> {
                if (event.document === targetDocument && !filterRange(targetDocument).contains(event.contentChanges[0].range)) return
                documentToDocumentTransform(lastActiveSourceDocument, targetDocument)
            })
            vscode.window.onDidChangeTextEditorSelection(event=> {
                if (event.textEditor.document === targetDocument) return
                documentToDocumentTransform(lastActiveSourceDocument, targetDocument)
            })            
            vscode.window.onDidChangeActiveTextEditor(event=> {
                // when switching documents a selection change event is also sent most of the time
                // if we update the document on this event, the selections will be wrong
                // TODO - need to investigate work arounds to make the behavior more reliable
                // but we are impared by vscodes unreliable behavior in this case
                if (event.document !== targetDocument)
                    lastActiveSourceDocument = event.document
            })
            return editor;
        });
}

export function alignToCursor(textEditor: vscode.TextEditor, ranges: Array<vscode.Range>) {
    ranges = edit.makeVerticalRangesWithinBlock(textEditor, ranges);
    textEditor.selections = edit.makeSelectionsFromRanges(ranges);
    const lineInfos = edit.makeLineInfos(textEditor, ranges);
    textEditor.edit(function (editBuilder) {
        lineInfos.forEach(line => {
            const lineLeftOfCursor = line.line.text.substring(0, line.range.start.character);
            const trimmedRight = line.line.text.substring(line.range.start.character).trim();

            editBuilder.replace(edit.expandRangeFullLineWidth(textEditor.document, line.range), lineLeftOfCursor + trimmedRight );
        });
    })
}

export function alignCSV(textEditor: vscode.TextEditor, ranges: Array<vscode.Range>) {
    const lines = linesFromRangesExpandBlockIfEmpty(textEditor, ranges);
    const linesParts = lines.map(line=>line.text.split(','));
    const newLineTexts:string[] = []
    const linePartCount = linesParts[0].length;
    for (let columnIndex = 0; columnIndex < linePartCount; columnIndex++) {
        const max = maxLength(linesParts, 0);
        appendColumn(newLineTexts, linesParts, max);
        if (columnIndex != linePartCount - 1)
            appendDelimeter(newLineTexts, ',');
    }

    edit.replaceLinesWithText(textEditor, lines, newLineTexts);
}

function appendColumn(lines:string[], linesParts:string[][], max:number) {
    for (let linePartIndex = 0; linePartIndex < linesParts.length; linePartIndex++) {
        const part = padRight(linesParts[linePartIndex].shift(), max);
        
        if (lines[linePartIndex] == undefined) lines[linePartIndex] = '';
        lines[linePartIndex] += part;
    }
}

function appendDelimeter(lines:string[], delimeter:string) {
    for (let linePartIndex = 0; linePartIndex  < lines.length; linePartIndex++) {
        lines[linePartIndex] = lines[linePartIndex] + delimeter
        
    }
}

function padRight(text:string, count:number) {
    const padAmount = count - text.length;
    return text + ' '.repeat(padAmount+1);
}

function maxLength(texts:string[][], partIndex:number) {
    let max = 0;
    return texts.map(text=>text[partIndex].length).reduce((prev, curr)=>{
        return curr>=prev?curr:prev;
    })
}

export function compactCSV(textEditor: vscode.TextEditor, ranges: Array<vscode.Range>) {
    const lines = linesFromRangesExpandBlockIfEmpty(textEditor, ranges);
    const linesParts = lines.map(line=>line.text.split(','));
    const newLineTexts:string[] = []
    const linePartCount = linesParts[0].length;
    for (let columnIndex = 0; columnIndex < linePartCount; columnIndex++) {
        const max = maxLength(linesParts, 0);
        compactColumn(newLineTexts, linesParts, max);
        if (columnIndex != linePartCount - 1)
            appendDelimeter(newLineTexts, ',');
    }

    edit.replaceLinesWithText(textEditor, lines, newLineTexts);
}

function compactColumn(lines:string[], linesParts:string[][], max:number) {
    for (let linePartIndex = 0; linePartIndex < linesParts.length; linePartIndex++) {
        const part = linesParts[linePartIndex].shift().trim()
        
        if (lines[linePartIndex] == undefined) lines[linePartIndex] = '';
        lines[linePartIndex] += part;
    }
}

export function copyToNewDocument(textEditor: vscode.TextEditor) {
    edit.selectionsOrMatchesAsSelectionsOrDocument(textEditor)
        .then(selections=> {
            const textFromSelections = edit.textsFromRanges(textEditor.document, selections);
            edit.openShowDocument(originName(textEditor), textFromSelections.join('\n'));
        });
}

export function selectLines(textEditor: vscode.TextEditor) {
    edit.selectionsOrMatchesAsSelectionsOrDocument(textEditor)
        .then(selections=> {
            textEditor.selections = selections.map(selection=> {
                const range = edit.expandRangeFullLineWidth(textEditor.document, selection)
                return new vscode.Selection(range.start, range.end);
            })
        });
}

export function linesAsJSON(textEditor: vscode.TextEditor) {
    const lines = edit.linesFromRange(textEditor.document, textEditor.selection)
    const jsonLines = lines.map(line=>JSON.stringify(line.text) + ",")
    edit.replaceLinesWithText(textEditor, lines, jsonLines);
}