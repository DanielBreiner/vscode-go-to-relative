import * as vscode from "vscode";
import { clamp } from "./utils";
import { handleInput } from "./input";

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand("go-to-relative.goToLine", async () => {
			await command({ startNegative: false, select: false });
		})
	);
	context.subscriptions.push(
		vscode.commands.registerCommand(
			"go-to-relative.goToLineNegative",
			async () => {
				await command({ startNegative: true, select: false });
			}
		)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand(
			"go-to-relative.selectToLine",
			async () => {
				await command({ startNegative: false, select: true });
			}
		)
	);
	context.subscriptions.push(
		vscode.commands.registerCommand(
			"go-to-relative.selectToLineNegative",
			async () => {
				await command({ startNegative: true, select: true });
			}
		)
	);
}

async function command({
	startNegative,
	select,
}: {
	startNegative: boolean;
	select: boolean;
}) {
	const editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}
	const configuration = vscode.workspace.getConfiguration();
	const initialSelection = editor.selection;
  	const initialRange = new vscode.Range(initialSelection.start, initialSelection.end);
	const initialSetting = configuration.get("editor.lineNumbers");
	await configuration.update(
		"editor.lineNumbers",
		"relative",
		vscode.ConfigurationTarget.Global
	);
	const input = await handleInput({ editor, startNegative, select });
	if (input) {
		const position = new vscode.Position(
			clamp(
				editor.selection.active.line + input.lineDelta,
				0,
				editor.document.lineCount
			),
			input.column ?? editor.selection.active.character
		);
		editor.selection = new vscode.Selection(
			select ? editor.selection.start : position,
			position
		);
		editor.revealRange(editor.selection, vscode.TextEditorRevealType.InCenter);
		
	} else {
		editor.revealRange(initialRange, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
	}
	await configuration.update(
		"editor.lineNumbers",
		initialSetting,
		vscode.ConfigurationTarget.Global
	);
}

export function deactivate() {}
