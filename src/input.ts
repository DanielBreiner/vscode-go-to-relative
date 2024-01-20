import * as vscode from "vscode";
import { clamp } from "./utils";
import { removeHighlight, highlight } from "./highlight";

export type Input = {
	lineDelta: number;
	column: number | undefined;
};

export function handleInput({
	editor,
	startNegative,
}: {
	editor: vscode.TextEditor;
	startNegative: boolean;
}) {
	return new Promise<Input | undefined>((resolve) => {
		const inputBox = vscode.window.createInputBox();
		inputBox.show();
		inputBox.value = startNegative ? "-" : "";
		inputBox.valueSelection = [1, 1];
		inputBox.prompt = `Current line: ${
			editor.selection.active.line + 1
		}, Character: ${
			editor.selection.active.character + 1
		}. Type a line number between -${editor.selection.active.line} and ${
			editor.document.lineCount - editor.selection.active.line
		} to jump to that line.`;
		inputBox.onDidChangeValue((value) => {
			const result = parseInput(value);
			removeHighlight(editor);
			if (!result.ok) {
				inputBox.validationMessage = result.error;
			} else {
				inputBox.validationMessage = undefined;
				const { lineDelta, column } = result.value;
				const lineNumber = clamp(
					editor.selection.active.line + lineDelta + 1,
					1,
					editor.document.lineCount
				);
				inputBox.prompt = `${
					lineDelta === 0 ? "Stay at" : "Go to"
				} line ${lineNumber}`;
				if (column !== undefined) {
					inputBox.prompt += ` and character ${Math.min(
						column,
						editor.document.lineAt(lineNumber - 1).text.length
					)}`;
				}

				highlight({ editor, input: result.value });
			}
		});
		inputBox.onDidAccept(() => {
			const result = parseInput(inputBox.value);
			if (result.ok) {
				resolve(result.value);
				inputBox.hide();
			}
		});
		inputBox.onDidHide(() => {
			removeHighlight(editor);
			resolve(undefined);
			inputBox.dispose();
		});
	});
}

function parseInput(
	inputValue: string
): { ok: false; error: string } | { ok: true; value: Input } {
	const regex = /^(-?\d+)?(?::(\d+)?)?$/;
	const match = inputValue.match(regex);
	if (match) {
		const lineDelta = match[1] ? parseInt(match[1]) : 0;
		const column = match[2] ? parseInt(match[2]) : undefined;
		if (column === undefined || column > 0) {
			return {
				ok: true,
				value: {
					lineDelta,
					column: match[2] ? parseInt(match[2]) : undefined,
				},
			};
		}
	}
	return {
		ok: false,
		error: "Invalid input",
	};
}
