export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  mood: string;
  audioUrl: string;
}

export const RELAX_TRACKS: MusicTrack[] = [
  {
    id: 'chill-1',
    title: "The Girl I Haven't Met",
    artist: 'Kudasaibeats',
    mood: 'дождь и пианино',
    audioUrl:
      'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/9d/b5/a4/9db5a492-557e-a3b7-b07a-e7a3cb0943f7/mzaf_13442994239320567104.plus.aac.p.m4a',
  },
  {
    id: 'chill-2',
    title: 'Sakura',
    artist: 'gummy3000',
    mood: 'нежный лоу-фай',
    audioUrl:
      'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview116/v4/74/54/92/745492f4-12dd-cd9d-6135-f31130b36c8d/mzaf_1203592183840023530.plus.aac.p.m4a',
  },
  {
    id: 'chill-3',
    title: 'Merry-Go-Round of Life',
    artist: 'Joe Hisaishi',
    mood: 'атмосферный вальс',
    audioUrl:
      'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/6c/21/fe/6c21fe59-d1b5-457c-1fd2-c6475107cf27/mzaf_1742732144361176660.plus.aac.p.m4a',
  },
  {
    id: 'chill-4',
    title: 'controlla',
    artist: 'Idealism',
    mood: 'тёплый чилл',
    audioUrl:
      'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/35/45/98/3545986a-4e35-473f-2fc6-784cc06a8aa6/mzaf_1484411353781049225.plus.aac.p.m4a',
  },
  {
    id: 'chill-5',
    title: "I'm Closing My Eyes",
    artist: 'potsu feat. Shiloh',
    mood: 'уютная гитара',
    audioUrl:
      'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview112/v4/92/46/17/924617d7-5f7d-38ee-6015-6f967e58d63e/mzaf_2929103300763082961.plus.aac.p.m4a',
  },
  {
    id: 'chill-6',
    title: 'Losing Interest',
    artist: 'Stract & Shiloh Dynasty',
    mood: 'ночной вайб',
    audioUrl:
      'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/d3/7c/8c/d37c8c51-3e93-aede-96c2-afe7d75a2728/mzaf_17761240837307342389.plus.aac.p.m4a',
  },
];
