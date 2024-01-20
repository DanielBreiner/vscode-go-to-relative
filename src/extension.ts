import * as vscode from "vscode";
import { clamp } from "./utils";
import { handleInput } from "./input";

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand("go-to-relative.goToLine", async () => {
			await command({ startNegative: false });
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand(
			"go-to-relative.goToLineNegative",
			async () => {
				await command({ startNegative: true });
			}
		)
	);
}

async function command({ startNegative }: { startNegative: boolean }) {
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
	const input = await handleInput({ startNegative, editor });
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
	await configuration.update(
		"editor.lineNumbers",
		initialSetting,
		vscode.ConfigurationTarget.Global
	);
}

export function deactivate() {}
