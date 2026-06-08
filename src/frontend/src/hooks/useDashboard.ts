import { useState, useEffect } from 'react';
import { newsService, type NewsItem } from '../services/newsService';
import { weatherService, type WeatherData } from '../services/weatherService';
import { noteService, type NoteItem } from '../services/noteService';
import { suggestionService, type SuggestionItem } from '../services/suggestionService';
import type { NewsTab } from '../components/dashboard/dashboardConstants';

/** Live minutes-since-midnight clock, updated every 60s. */
export function useNowMinutes() {
  const [nowMinutes, setNowMinutes] = useState(() => {
    const d = new Date(); return d.getHours() * 60 + d.getMinutes();
  });
  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date(); setNowMinutes(d.getHours() * 60 + d.getMinutes());
    }, 60_000);
    return () => clearInterval(timer);
  }, []);
  return nowMinutes;
}

/** News list for the selected category tab. */
export function useNews(tab: NewsTab) {
  const [news, setNews] = useState<NewsItem[]>([]);
  useEffect(() => {
    newsService.getByCategory(tab).then(setNews).catch(console.error);
  }, [tab]);
  return news;
}

/** Current weather + city selection state. */
export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [selectedCityKey, setSelectedCityKey] = useState(() => weatherService.getSelectedCityKey());
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [citySearch, setCitySearch] = useState('');

  useEffect(() => {
    weatherService.getCurrent(selectedCityKey).then(setWeather).catch(console.error);
  }, [selectedCityKey]);

  function selectCity(key: string) {
    weatherService.setSelectedCityKey(key);
    setSelectedCityKey(key);
    setShowCityPicker(false);
    setWeather(null);
  }

  return { weather, selectedCityKey, showCityPicker, setShowCityPicker, citySearch, setCitySearch, selectCity };
}

/** Recent notes with live search. */
export function useNotes() {
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [noteSearch, setNoteSearch] = useState('');
  const [notesError, setNotesError] = useState(false);

  useEffect(() => {
    setNotesError(false);
    const req = noteSearch.trim() ? noteService.search(noteSearch) : noteService.list(5);
    req.then(setNotes).catch(() => setNotesError(true));
  }, [noteSearch]);

  return { notes, noteSearch, setNoteSearch, notesError };
}

/** AI work suggestions with loading/error state and manual reload. */
export function useSuggestions() {
  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [suggestionsError, setSuggestionsError] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(true);

  const loadSuggestions = () => {
    setSuggestionsLoading(true);
    setSuggestionsError(false);
    suggestionService.get()
      .then(data => { setSuggestions(data); setSuggestionsLoading(false); })
      .catch(() => { setSuggestionsError(true); setSuggestionsLoading(false); });
  };
  useEffect(loadSuggestions, []);

  return { suggestions, setSuggestions, suggestionsError, suggestionsLoading, loadSuggestions };
}
