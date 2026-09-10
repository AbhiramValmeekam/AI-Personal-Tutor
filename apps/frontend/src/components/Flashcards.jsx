import React, { useState, useEffect, useRef } from "react";

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3002";

export const Flashcards = ({ chatHistory, onClose }) => {
  const [deck, setDeck] = useState(null);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const generateDeck = async () => {
    if (!chatHistory || chatHistory.length === 0) {
      setError("No conversation history available for flashcards");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_BASE_URL}/flashcards/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatHistory }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate flashcards: ${response.statusText}`);
      }

      const deckData = await response.json();
      if (!deckData.cards || !Array.isArray(deckData.cards) || deckData.cards.length === 0) {
        throw new Error("No cards returned");
      }
      setDeck(deckData);
      setIndex(0);
      setFlipped(false);
      setKnown({});
    } catch (err) {
      console.error("Error generating flashcards:", err);
      setError("Failed to generate flashcards. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const shuffle = () => {
    if (!deck) return;
    const cards = [...deck.cards];
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    setDeck({ ...deck, cards });
    setIndex(0);
    setFlipped(false);
  };

  const goTo = (i) => {
    if (!deck) return;
    setIndex(Math.max(0, Math.min(deck.cards.length - 1, i)));
    setFlipped(false);
  };

  const markKnown = (value) => {
    if (!deck) return;
    const card = deck.cards[index];
    setKnown((prev) => ({ ...prev, [card.id]: value }));
    if (index < deck.cards.length - 1) {
      goTo(index + 1);
    }
  };

  // Popup focus priority: grab keyboard focus on open/state change, Escape closes
  const modalRef = useRef(null);
  useEffect(() => {
    if (modalRef.current) modalRef.current.focus();
  }, [isLoading, error, deck]);
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (!deck || isLoading || error) return;
      if (e.key === "ArrowRight") goTo(index + 1);
      if (e.key === "ArrowLeft") goTo(index - 1);
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Initialize deck on component mount
  useEffect(() => {
    generateDeck();
  }, []);

  if (isLoading) {
    return (
      <div ref={modalRef} tabIndex={-1} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 pointer-events-auto outline-none">
        <div className="bg-gray-800 rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
            <h3 className="text-xl font-medium text-white mb-2">Making Your Flashcards</h3>
            <p className="text-gray-300">Pulling key topics from your conversation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div ref={modalRef} tabIndex={-1} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 pointer-events-auto outline-none">
        <div className="bg-gray-800 rounded-lg p-8 max-w-2xl w-full mx-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-white">Flashcards</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="bg-red-900 bg-opacity-50 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-100">{error}</p>
          </div>
          <div className="flex justify-end space-x-3">
            <button
              onClick={() => { setError(""); generateDeck(); }}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!deck || !deck.cards || deck.cards.length === 0) {
    return null;
  }

  const card = deck.cards[index];
  const isLast = index === deck.cards.length - 1;
  const isFirst = index === 0;
  const knownCount = Object.values(known).filter(Boolean).length;

  return (
    <div ref={modalRef} tabIndex={-1} className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 pointer-events-auto outline-none">
      <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-white">{deck.deckTitle}</h2>
            <p className="text-gray-400 text-sm">
              Card {index + 1} of {deck.cards.length} · {knownCount} marked known
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={shuffle}
              title="Shuffle deck"
              className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 3h5v5M4 20L21 3M21 16v5h-5m-9-2H3v-5m18-4l-6 6" />
              </svg>
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white p-2 rounded-lg hover:bg-gray-700 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-700 rounded-full h-2 mb-5">
          <div
            className="bg-teal-500 h-2 rounded-full transition-all"
            style={{ width: `${((index + 1) / deck.cards.length) * 100}%` }}
          ></div>
        </div>

        {/* Card */}
        <button
          onClick={() => setFlipped((f) => !f)}
          className="w-full text-left bg-gray-700 hover:bg-gray-600 transition-colors rounded-xl p-8 min-h-[220px] flex flex-col justify-center items-center cursor-pointer border border-gray-600"
        >
          <span className="text-xs uppercase tracking-widest text-teal-300 mb-3">
            {card.topic} · {flipped ? "Answer" : "Question"} — click to flip
          </span>
          <p className="text-xl md:text-2xl font-medium text-white text-center leading-relaxed">
            {flipped ? card.back : card.front}
          </p>
          {known[card.id] !== undefined && (
            <span className={`mt-4 text-xs font-semibold px-3 py-1 rounded-full ${known[card.id] ? "bg-green-900 text-green-200" : "bg-amber-900 text-amber-200"}`}>
              {known[card.id] ? "Known" : "Still learning"}
            </span>
          )}
        </button>

        {/* Know / Don't know */}
        <div className="flex justify-center gap-3 mt-4">
          <button
            onClick={() => markKnown(false)}
            className="px-5 py-2 bg-amber-700 text-white rounded-lg hover:bg-amber-600 transition-colors text-sm font-medium"
          >
            Still learning
          </button>
          <button
            onClick={() => markKnown(true)}
            className="px-5 py-2 bg-green-700 text-white rounded-lg hover:bg-green-600 transition-colors text-sm font-medium"
          >
            I know this
          </button>
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-5">
          <button
            onClick={() => goTo(index - 1)}
            disabled={isFirst}
            className={`px-6 py-3 rounded-lg transition-colors flex items-center ${isFirst ? "bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-gray-600 text-white hover:bg-gray-500"}`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Prev
          </button>
          <button
            onClick={() => goTo(index + 1)}
            disabled={isLast}
            className={`px-6 py-3 rounded-lg transition-colors flex items-center ${isLast ? "bg-gray-700 text-gray-500 cursor-not-allowed" : "bg-teal-600 text-white hover:bg-teal-500"}`}
          >
            Next
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <p className="text-center text-gray-500 text-xs mt-4">← → navigate · Space flips · Esc closes</p>
      </div>
    </div>
  );
};
