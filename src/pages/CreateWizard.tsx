import { useNavigate, useParams } from "react-router-dom";
import WizardView from "../components/WizardView";
import { useContentStore } from "../store/contentStore";
import { usePlayerStore } from "../store/playerStore";

export default function CreateWizard() {
  const { id } = useParams();
  const navigate = useNavigate();
  const content = useContentStore((s) => s.content);
  const character = usePlayerStore((s) => s.characters.find((c) => c.id === id));
  const replaceCharacter = usePlayerStore((s) => s.replaceCharacter);
  const completeCharacter = usePlayerStore((s) => s.completeCharacter);
  const setActive = usePlayerStore((s) => s.setActive);

  const setting = content?.settings.find((s) => s.id === character?.settingId);

  if (!content || !character || !setting) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-10">
        <p className="text-stone-400">Персонаж не найден.</p>
        <button onClick={() => navigate("/")} className="mt-4 min-h-[44px] rounded-xl border border-stone-600 px-5">
          На главную
        </button>
      </main>
    );
  }
  if (usePlayerStore.getState().activeCharacterId !== character.id) setActive(character.id);

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <WizardView
        content={content}
        setting={setting}
        character={character}
        onCharacter={replaceCharacter}
        onComplete={() => {
          completeCharacter();
          navigate(`/report/${character.id}`);
        }}
      />
    </main>
  );
}
