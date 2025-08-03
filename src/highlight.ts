import * as vscode from "vscode";
import { Input } from "./input";

const lineHighlight = vscode.window.createTextEditorDecorationType({
	isWholeLine: true,
	borderColor: new vscode.ThemeColor("editor.rangeHighlightBorder"),
	borderWidth: "2px",
	borderStyle: "solid",
	backgroundColor: new vscode.ThemeColor("editor.rangeHighlightBackground"),
});

const cursorHighlight = vscode.window.createTextEditorDecorationType({
	backgroundColor: new vscode.ThemeColor("editorCursor.foreground"),
});

const selectionHighlight = vscode.window.createTextEditorDecorationType({
	backgroundColor: new vscode.ThemeColor("list.activeSelectionBackground"),
});

export function highlight({
	editor,
	input,
	select,
}: {
	editor: vscode.TextEditor;
	input: Input;
	select: boolean;
}) {
	const newPosition = new vscode.Position(
		editor.selection.active.line + input.lineDelta,
		input.column ?? editor.selection.active.character
	);
	if (select) {
		editor.setDecorations(selectionHighlight, [
			new vscode.Range(editor.selection.start, newPosition),
		]);
	} else {
		editor.setDecorations(lineHighlight, [
			new vscode.Range(newPosition, newPosition),
		]);
		if (input.column !== undefined) {
			editor.setDecorations(cursorHighlight, [
				new vscode.Range(newPosition, newPosition.translate(0, 1)),
			]);
		}
	}
	if (!editor.visibleRanges[0]?.contains(newPosition)) {
		editor.revealRange(
			new vscode.Range(newPosition, newPosition),
			vscode.TextEditorRevealType.InCenter
		);
	}
}

export function removeHighlight(editor: vscode.TextEditor) {
	editor.setDecorations(lineHighlight, []);
	editor.setDecorations(cursorHighlight, []);
	editor.setDecorations(selectionHighlight, []);
}
