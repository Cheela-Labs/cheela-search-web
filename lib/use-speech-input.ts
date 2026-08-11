"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Dictation for the search bar, via the Web Speech API.
 *
 * The design puts a microphone in the bar. Rendering one that does nothing is
 * worse than rendering none at all, so `supported` is false wherever the API
 * is missing and the composer omits the control entirely rather than showing a
 * dead one. Feature-detected on mount rather than at module scope, because the
 * check touches `window` and this module is imported into a server render.
 */

type SpeechAlternative = { transcript: string };

type SpeechResult = {
	readonly length: number;
	readonly isFinal: boolean;
	readonly [index: number]: SpeechAlternative;
};

type SpeechResultList = {
	readonly length: number;
	readonly [index: number]: SpeechResult;
};

type SpeechEvent = { resultIndex: number; results: SpeechResultList };

type SpeechRecognizer = {
	lang: string;
	continuous: boolean;
	interimResults: boolean;
	start: () => void;
	stop: () => void;
	abort: () => void;
	onresult: ((event: SpeechEvent) => void) | null;
	onend: (() => void) | null;
	onerror: (() => void) | null;
};

type RecognizerConstructor = new () => SpeechRecognizer;

function recognizerConstructor(): RecognizerConstructor | null {
	if (typeof window === "undefined") return null;
	const scope = window as unknown as {
		SpeechRecognition?: RecognizerConstructor;
		webkitSpeechRecognition?: RecognizerConstructor;
	};
	return scope.SpeechRecognition ?? scope.webkitSpeechRecognition ?? null;
}

export function useSpeechInput(onTranscript: (text: string) => void) {
	const [supported, setSupported] = useState(false);
	const [listening, setListening] = useState(false);
	const recognizerRef = useRef<SpeechRecognizer | null>(null);
	// Held in a ref so the recognizer's handlers always call the current
	// callback without having to be torn down and rebuilt on every keystroke.
	const onTranscriptRef = useRef(onTranscript);
	onTranscriptRef.current = onTranscript;

	useEffect(() => {
		setSupported(recognizerConstructor() !== null);
		return () => {
			recognizerRef.current?.abort();
			recognizerRef.current = null;
		};
	}, []);

	const stop = useCallback(() => {
		recognizerRef.current?.stop();
		setListening(false);
	}, []);

	const start = useCallback(() => {
		const Recognizer = recognizerConstructor();
		if (!Recognizer) return;

		const recognizer = new Recognizer();
		recognizer.lang =
			typeof navigator === "undefined" ? "en-US" : navigator.language;
		recognizer.continuous = false;
		recognizer.interimResults = false;

		recognizer.onresult = (event) => {
			let transcript = "";
			for (let i = event.resultIndex; i < event.results.length; i += 1) {
				const result = event.results[i];
				if (result?.isFinal) transcript += result[0]?.transcript ?? "";
			}
			if (transcript.trim()) onTranscriptRef.current(transcript.trim());
		};
		// Permission denied and no-speech both land here. Neither is worth an
		// error state in the bar — the mic simply stops being lit.
		recognizer.onerror = () => setListening(false);
		recognizer.onend = () => setListening(false);

		recognizerRef.current = recognizer;
		recognizer.start();
		setListening(true);
	}, []);

	const toggle = useCallback(() => {
		if (listening) stop();
		else start();
	}, [listening, start, stop]);

	return { supported, listening, toggle };
}
