// src/hooks/useContextualSaveBar.js
import { useEffect } from "react";

const useContextualSaveBar = (
    isDirty,
    isSaving,
    onSave,
    onDiscard
) => {
    useEffect(() => {
        // 1. Show or Hide the bar based on the dirty state
        if (isDirty) {
            shopify.saveBar.show("my-save-bar");
        } else {
            shopify.saveBar.hide("my-save-bar");
        }

        // 2. Update the loading/disabled state of the buttons
        if (isSaving) {
            shopify.saveBar.loading("my-save-bar");
        } else {
            // This returns the bar to its interactive state
            shopify.saveBar.loaded("my-save-bar");
        }

        // 3. Attach listeners
        // Note: App Bridge v4 uses standard DOM event listeners on the saveBar
        const saveListener = () => onSave();
        const discardListener = () => onDiscard();

        addEventListener("savebarbtnclick", (e) => {
            if (e.detail.button === "save") saveListener();
            if (e.detail.button === "discard") discardListener();
        });

        // Cleanup: Hide the bar when the component unmounts
        return () => {
            shopify.saveBar.hide("my-save-bar");
        };
    }, [isDirty, isSaving, onSave, onDiscard]);
};

export { useContextualSaveBar };