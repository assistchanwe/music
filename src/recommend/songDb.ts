import rawSongs from './songs.json';
import { noteNameToMidi } from '../audio/notes';
import type { Song } from './recommend';

interface RawSong {
  title: string;
  artist: string;
  genre: string;
  low: string;
  high: string;
}

// 곡별 음역대는 공개된 노래방 음역 자료 기준의 근사치
export const SONGS: Song[] = (rawSongs as RawSong[]).map((s) => ({
  title: s.title,
  artist: s.artist,
  genre: s.genre,
  lowNote: noteNameToMidi(s.low),
  highNote: noteNameToMidi(s.high),
}));
