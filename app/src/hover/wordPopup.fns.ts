import { lookupPrebaked, type PrebakedEntry, type BridgeInfo } from "@tsumugu/engine";
import type { ReaderState } from "../app/state.js";
import { dictUrlFor, readRailParams } from "../dict/dictLink.js";
import { resolveKind, lookupShardEntry, type ShardDictEntry } from "../dict/dictResolve.js";
import { glossForEntry, readingForEntry } from "../reader/reading.js";
import { clear, el } from "../ui/dom.js";
import { CLS } from "../ui/classes.js";
export function paintEntryFromPart(ctx: any, word: string, entry: PrebakedEntry | undefined, anchor: HTMLElement): void {
const { settings } = ctx.state;
    const glossLang = settings.gloss;
    
    const shardPromise = ctx.lookupShardEntry(word);
    const reading = ctx.readingForEntry(entry, settings.reading);
    const preGloss = ctx.glossForEntry(entry, glossLang);

    if (ctx.glyphEl) ctx.glyphEl.textContent = word;
    if (ctx.readingEl) ctx.readingEl.textContent = reading;
    
    if (ctx.ipaEl) ctx.ipaEl.textContent = "";
    if (ctx.posEl) ctx.posEl.textContent = "";

    ctx.revealBtn?.remove();
    ctx.revealBtn = null;
    if (ctx.glossEl) {
      ctx.glossEl.textContent = preGloss || "—";
      ctx.glossEl.classList.remove(ctx.CLS.popupHidden);
      if (ctx.state.settings.guessFirst && preGloss) {
        ctx.glossEl.classList.add(ctx.CLS.popupHidden);
        ctx.revealBtn = ctx.el("button", {
          class: "dict reveal",
          text: "Reveal",
          title: "Reveal gloss (guess-first)",
        });
        ctx.revealBtn.addEventListener("click", (ev: any) => {
          ev.stopPropagation();
          ctx.glossEl.classList.remove(ctx.CLS.popupHidden);
          ctx.revealBtn?.remove();
          ctx.revealBtn = null;
        });
        ctx.glossEl.parentElement?.insertBefore(ctx.revealBtn, ctx.glossEl.nextSibling);
      }
    }

    
    
    const bridge = entry?.bridge;
    const showBridge = !!bridge && settings.rail === "vi";
    ctx.card!.classList.toggle("is-bridge", showBridge);

    if (ctx.bridgeEl && ctx.cogsEl && ctx.closeEl && ctx.enNoteEl) {
      if (showBridge) {
        ctx.bridgeEl.style.display = "";
        ctx.enNoteEl.style.display = "none";
        ctx.renderBridgeCogs(ctx.cogsEl, bridge!, word);
        ctx.closeEl.textContent = bridge!.meaning ?? bridge!.bridgeReading ?? "";
        ctx.bridgeEl.classList.remove("draw");
        void ctx.bridgeEl.offsetWidth;
        ctx.bridgeEl.classList.add("draw");
      } else if (bridge && settings.rail === "en") {
        ctx.bridgeEl.style.display = "none";
        ctx.enNoteEl.style.display = "";
        ctx.renderEnNote(ctx.enNoteEl, bridge, word);
      } else {
        ctx.bridgeEl.style.display = "none";
        ctx.enNoteEl.style.display = "none";
      }
    }
    if (ctx.exEl) ctx.exEl.style.display = "none";

    if (ctx.aAdd) {
      
      ctx.aAdd.onclick = (ev: any) => {
        ev.stopPropagation();
        ctx.state.recordSeen(word);
        if (settings.knownStateOn) ctx.state.gradeWord(word, "known");
        ctx.close();
      };
    }
    if (ctx.aKnown) {
      ctx.aKnown.style.display = settings.knownStateOn ? "" : "none";
      ctx.aKnown.onclick = (ev: any) => {
        ev.stopPropagation();
        ctx.state.gradeWord(word, "known");
        ctx.close();
      };
    }

    if (ctx.aDict) {
      ctx.aDict.textContent = "字 →";
      ctx.aDict.title = ctx.dictTitle(glossLang);
      void ctx.resolveKind(word).then((kind: any) => {
        const href = ctx.dictUrlFor(word, kind, ctx.readRailParams());
        ctx.aDict.setAttribute("href", href);
      });
    }

    if (ctx.encBtn) {
      ctx.encBtn.textContent = "Form";
      ctx.encBtn.title = "Form / encoding / components (modal)";
      ctx.encBtn.onclick = (ev: any) => {
        ev.stopPropagation();
        const modal = (window as { __tsgEnc?: { open: (w: string, c: unknown) => void } }).__tsgEnc;
        if (modal?.open) modal.open(word, (ctx.state as { content?: unknown }).content);
        else alert(`Form/encoding for ${word} (demo; local notes only)`);
      };
    }

    
    
    void shardPromise.then((shard: any) => {
      if (!shard || !ctx.card || !ctx.glossEl) return;
      
      const useG = glossLang === "vi" && shard.gv ? shard.gv : (shard.g || preGloss);
      if (useG && (!ctx.glossEl.textContent || ctx.glossEl.textContent === "—" || ctx.glossEl.textContent === preGloss)) {
        ctx.glossEl.textContent = useG;
      }
      ctx.glossEl.title = shard.g || shard.gv || "Definition from tsumugu-ed";

      
      
      const formText = shard.form || shard.components || shard.encoding || shard.hve || "";
      
      const priorForm = ctx.card.querySelector(".tsg-form");
      if (priorForm) priorForm.remove();
      
      
      
      if (formText) {
        const formHost = ctx.el("div", { class: "tsg-form", style: { margin: "8px 0", padding: "8px 10px", border: "1px solid var(--tsg-border)", borderRadius: "8px", background: "var(--tsg-sunk)", fontSize: "13px" } as any });
        const lbl = ctx.el("span", { class: "form-lbl", text: "Form: ", style: { fontWeight: "600", color: "var(--tsg-accent)" } as any });
        const val = ctx.el("span", { class: "form-val", text: formText });
        formHost.append(lbl, val);
        
        formHost.style.cursor = "pointer";
        formHost.addEventListener("click", (e: any) => {
          e.stopPropagation();
          const modal = (window as { __tsgEnc?: { open: (w: string, c: unknown) => void } }).__tsgEnc;
          if (modal?.open) modal.open(word, (ctx.state as { content?: unknown }).content);
        });
        
        ctx.glossEl.parentElement?.insertBefore(formHost, ctx.glossEl.nextSibling);
      }
      
    });

    
    if (ctx.aAdd) {
      
      ctx.aAdd.onclick = (ev: any) => {
        ev.stopPropagation();
        ctx.state.recordSeen(word);
        if (settings.knownStateOn) ctx.state.gradeWord(word, "known");
        ctx.close();
      };
    }
    if (ctx.aKnown) {
      ctx.aKnown.style.display = settings.knownStateOn ? "" : "none";
      ctx.aKnown.onclick = (ev: any) => {
        ev.stopPropagation();
        ctx.state.gradeWord(word, "known");
        ctx.close();
      };
    }

    ctx.card!.style.display = "block";
    ctx.scrim!.style.display = "block";
    ctx.positionCard(anchor, ctx.card!);
}
