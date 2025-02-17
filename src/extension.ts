'use strict';
import * as vscode from 'vscode';
import * as transforms from './Transforms';
import { Modify, View, Application } from './common/EditorFunctions';

export function activate(context: vscode.ExtensionContext) {
  Application.registerCommand(context, 'alexc155-transformer.sortLines', () => {
    const textEditor = vscode.window.activeTextEditor;
    const selections = textEditor.selections;
    transforms.sortLines(textEditor, selections);
  });

  Application.registerCommand(context, 'alexc155-transformer.sortSelections', () => {
    const textEditor = vscode.window.activeTextEditor;
    const selections = textEditor.selections;
    transforms.sortSelections(textEditor, selections);
  });

  Application.registerCommand(context, 'alexc155-transformer.reverseLines', () => {
    const textEditor = vscode.window.activeTextEditor;
    const selections = textEditor.selections;
    Modify.reverseLines(textEditor, selections);
  });

  Application.registerCommand(context, 'alexc155-transformer.reverseSelections', () => {
    const textEditor = vscode.window.activeTextEditor;
    const selections = textEditor.selections;
    transforms.reverseSelections(textEditor, selections);
  });

  Application.registerCommand(context, 'alexc155-transformer.uniqueLines', () => {
    const textEditor = vscode.window.activeTextEditor;
    const selections = textEditor.selections;
    transforms.uniqueLines(textEditor, selections);
  });

  Application.registerCommand(context, 'alexc155-transformer.uniqueLinesNewDocument', () => {
    const textEditor = vscode.window.activeTextEditor;
    const selections = textEditor.selections;
    transforms.uniqueLinesToNewDocument(textEditor, selections);
  });

  Application.registerCommand(context, 'alexc155-transformer.countUniqueLinesNewDocument', () => {
    const textEditor = vscode.window.activeTextEditor;
    const selections = textEditor.selections;
    transforms.countUniqueLinesToNewDocument(textEditor, selections);
  });

  Application.registerCommand(context, 'alexc155-transformer.sortByLineLength', () => {
    const textEditor = vscode.window.activeTextEditor;
    const selections = textEditor.selections;
    transforms.sortLinesByLength(textEditor, selections);
  });

  Application.registerCommand(context, 'alexc155-transformer.trimLines', () => {
    const textEditor = vscode.window.activeTextEditor;
    const selections = textEditor.selections;
    transforms.trimLines(textEditor, selections);
  });

  Application.registerCommand(context, 'alexc155-transformer.trimSelections', () => {
    const textEditor = vscode.window.activeTextEditor;
    const selections = textEditor.selections;
    transforms.trimSelections(textEditor, selections);
  });

  Application.registerCommand(context, 'alexc155-transformer.randomLines', () => {
    const textEditor = vscode.window.activeTextEditor;
    const selection = textEditor.selection;
    transforms.randomizeLines(textEditor, selection);
  });

  Application.registerCommand(context, 'alexc155-transformer.randomSelections', () => {
    const textEditor = vscode.window.activeTextEditor;
    const selections = textEditor.selections;
    transforms.randomizeSelections(textEditor, selections);
  });

  Application.registerCommand(context, 'alexc155-transformer.filter', () => {
    const textEditor = vscode.window.activeTextEditor;
    const selection = textEditor.selection;
    transforms.filterLines(textEditor, selection);
  });

  Application.registerCommand(context, 'alexc155-transformer.filterAsNewDocument', () => {
    const textEditor = vscode.window.activeTextEditor;
    const selection = textEditor.selection;
    transforms.filterLinesWithContextToNewDocument(textEditor, selection);
  });

  Application.registerCommand(context, 'alexc155-internal.command', (onCommand) => onCommand());

  Application.registerCommand(context, 'alexc155-transformer.alignCursor', () => {
    const textEditor = vscode.window.activeTextEditor;
    const selections = textEditor.selections;
    transforms.alignToCursor(textEditor, selections);
  });

  Application.registerCommand(context, 'alexc155-transformer.alignCSV', () => {
    const textEditor = vscode.window.activeTextEditor;
    const selections = textEditor.selections;
    transforms.alignCSV(textEditor, selections);
  });

  Application.registerCommand(context, 'alexc155-transformer.compactCSV', () => {
    const textEditor = vscode.window.activeTextEditor;
    const selections = textEditor.selections;
    transforms.compactCSV(textEditor, selections);
  });

  Application.registerCommand(context, 'alexc155-transformer.commands', () => {
    vscode.commands.getCommands().then((commandList) => {
      const content = commandList.reduce((prev, curr) => prev + '\n' + curr);
      return View.openShowDocument('untitled:commands.txt', content);
    });
  });

  Application.registerCommand(context, 'alexc155-transformer.copyToNewDocument', () => {
    const textEditor = vscode.window.activeTextEditor;
    transforms.copyToNewDocument(textEditor);
  });

  Application.registerCommand(context, 'alexc155-transformer.selectLines', () => {
    const textEditor = vscode.window.activeTextEditor;
    transforms.selectLines(textEditor);
  });

  Application.registerCommand(context, 'alexc155-transformer.selectHighlights', () => {
    transforms.selectHighlights();
  });

  Application.registerCommand(context, 'alexc155-transformer.linesAsJSON', () => {
    const textEditor = vscode.window.activeTextEditor;
    transforms.linesAsJSON(textEditor);
  });

  Application.registerCommand(context, 'alexc155-transformer.selectionAsJSON', () => {
    const textEditor = vscode.window.activeTextEditor;
    transforms.selectionAsJSON(textEditor);
  });

  Application.registerCommand(context, 'alexc155-transformer.JsonAsText', () => {
    const textEditor = vscode.window.activeTextEditor;
    transforms.jsonStringAsText(textEditor);
  });

  Application.registerCommand(context, 'alexc155-transformer.escapes', () => {
    const textEditor = vscode.window.activeTextEditor;
    transforms.escapes(textEditor);
  });

  Application.registerCommand(context, 'alexc155-transformer.joinLines', () => {
    const textEditor = vscode.window.activeTextEditor;
    transforms.joinLines(textEditor);
  });

  Application.registerCommand(context, 'alexc155-transformer.splitLines', () => {
    const textEditor = vscode.window.activeTextEditor;
    transforms.splitLines(textEditor);
  });

  Application.registerCommand(context, 'alexc155-transformer.splitLinesBeforeDelimiter', () => {
    const textEditor = vscode.window.activeTextEditor;
    transforms.splitLinesBeforeDelimiter(textEditor);
  });

  Application.registerCommand(context, 'alexc155-transformer.splitLinesAfterDelimiter', () => {
    const textEditor = vscode.window.activeTextEditor;
    transforms.splitLinesAfterDelimiter(textEditor);
  });

  Application.registerCommand(context, 'alexc155-transformer.rotateForwardSelections', () => {
    const textEditor = vscode.window.activeTextEditor;
    transforms.rotateForwardSelections(textEditor);
  });

  Application.registerCommand(context, 'alexc155-transformer.rotateBackwardSelections', () => {
    const textEditor = vscode.window.activeTextEditor;
    transforms.rotateBackwardSelections(textEditor);
  });

  Application.registerCommand(context, 'alexc155-transformer.normalizeDiacriticalMarks', () => {
    const textEditor = vscode.window.activeTextEditor;
    transforms.normalizeDiacriticalMarks(textEditor);
  });

  Application.registerCommand(context, 'alexc155-transformer.loremIpsum', () => {
    const textEditor = vscode.window.activeTextEditor;
    transforms.loremIpsum(textEditor);
  });

  Application.registerCommand(context, 'alexc155-transformer.convertToMarkdownTable', () => {
    const textEditor = vscode.window.activeTextEditor;
    transforms.convertToMarkdownTable(textEditor);
  });

  Application.registerCommand(context, 'alexc155-transformer.showSnippets', () => {
    const textEditor = vscode.window.activeTextEditor;
    transforms.showSnippets(textEditor);
  });
}

export function deactivate() {}
