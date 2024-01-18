import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand("go-to-relative.gotoLine", async () => {
			await new GoToCommand({ gotoLineNegative: false }).execute();
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand(
			"go-to-relative.gotoLineNegative",
			async () => {
				await new GoToCommand({ gotoLineNegative: true }).execute();
			}
		)
	);
	vscode.commands.executeCommand("setContext", "go-to-relative.active", true);
}

type Input = {
	lineDelta: number;
	column: number | undefined;
};

class GoToCommand {
	private gotoLineNegative: boolean;

	lineHighlight = vscode.window.createTextEditorDecorationType({
		isWholeLine: true,
		borderColor: new vscode.ThemeColor("editor.rangeHighlightBorder"),
		borderWidth: "2px",
		borderStyle: "solid",
		backgroundColor: new vscode.ThemeColor(
			"editor.rangeHighlightBackground"
		),
	});
	cursorHighlight = vscode.window.createTextEditorDecorationType({
		borderColor: new vscode.ThemeColor("editorCursor.foreground"),
		borderWidth: "2px",
		borderStyle: "solid",
		backgroundColor: new vscode.ThemeColor("editorCursor.foreground"),
	});

	constructor({ gotoLineNegative }: { gotoLineNegative: boolean }) {
		this.gotoLineNegative = gotoLineNegative;
	}

	async execute() {
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			return;
		}
		const configuration = vscode.workspace.getConfiguration();
		const initialSetting = configuration.get("editor.lineNumbers");
		await configuration.update(
			"editor.lineNumbers",
			"relative",
			vscode.ConfigurationTarget.Global
		);
		const input = await this.handleInput(editor);
		if (input) {
			const position = new vscode.Position(
				clamp(
					editor.selection.active.line + input.lineDelta,
					0,
					editor.document.lineCount
				),
				input.column ?? editor.selection.active.character
			);
			editor.selection = new vscode.Selection(position, position);
		}
		this.removeHighlight(editor);
		await configuration.update(
			"editor.lineNumbers",
			initialSetting,
			vscode.ConfigurationTarget.Global
		);
	}

	handleInput(editor: vscode.TextEditor) {
		return new Promise<Input | undefined>((resolve) => {
			const inputBox = vscode.window.createInputBox();
			inputBox.show();
			inputBox.value = this.gotoLineNegative ? "-" : "";
			inputBox.valueSelection = [1, 1];
			inputBox.prompt = `Current line: ${
				editor.selection.active.line + 1
			}, Character: ${
				editor.selection.active.character + 1
			}. Type a line number between -${
				editor.selection.active.line
			} and ${
				editor.document.lineCount - editor.selection.active.line
			} to jump to that line.`;
			inputBox.onDidChangeValue((value) => {
				const result = this.parseInput(value);
				this.removeHighlight(editor);
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

					this.highlight({ editor, input: result.value });
				}
			});
			inputBox.onDidAccept(() => {
				const result = this.parseInput(inputBox.value);
				if (result.ok) {
					resolve(result.value);
					inputBox.hide();
				}
			});
			inputBox.onDidHide(() => {
				resolve(undefined);
				inputBox.dispose();
			});
		});
	}

	parseInput(
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

	highlight({ editor, input }: { editor: vscode.TextEditor; input: Input }) {
		const newPosition = new vscode.Position(
			editor.selection.active.line + input.lineDelta,
			input.column ?? editor.selection.active.character
		);
		editor.setDecorations(this.lineHighlight, [
			new vscode.Range(newPosition, newPosition),
		]);
		if (input.column !== undefined) {
			editor.setDecorations(this.cursorHighlight, [
				new vscode.Range(newPosition, newPosition.translate(0, 1)),
			]);
		}
		if (!editor.visibleRanges[0]?.contains(newPosition)) {
			editor.revealRange(
				new vscode.Range(newPosition, newPosition),
				vscode.TextEditorRevealType.InCenterIfOutsideViewport
			);
		}
	}

	removeHighlight(editor: vscode.TextEditor) {
		editor.setDecorations(this.lineHighlight, []);
		editor.setDecorations(this.cursorHighlight, []);
	}
}

export function deactivate() {}

function clamp(num: number, min: number, max: number) {
	return Math.min(Math.max(num, min), max);
}
