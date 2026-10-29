// A scripted stand-in for the LLM, so the Director screen can be tried without any model. It reads the producer's first sentence for the numbers
// (episodes, length, aspect) and writes plausible, clearly fake content. Real work uses the LLM set in Settings.
import type { LlmFn } from './ai';
import { splitSeconds } from './series';
import { FORMATS, detectFormat } from './formats';
import { defaultSections } from './music';

const num = (s: string, re: RegExp, d: number) => { const m = re.exec(s); return m ? Number(m[1]) : d; };

export const demoCrew: LlmFn = async (system, user) => {
  await new Promise((r) => setTimeout(r, 700));
  const said = user;
  const stage = /STAGE: (\w+)/.exec(system)?.[1] ?? 'intake';
  const total = num(system, /episodes=(\d+)/, 1);
  const epSec = num(system, /episode_seconds=(\d+)/, 90);
  const clipSec = num(system, /clip_seconds=([\d.]+)/, 10);
  const epNo = num(system, /current episode (\d+)/, 1);
  const lang = /language=en/.test(system) ? 'en' : 'ko';
  const fmtId = (/KIND OF WORK: (\w+)/.exec(system)?.[1] ?? 'drama') as keyof typeof FORMATS;
  const FM = FORMATS[fmtId] ?? FORMATS.drama;
  const ko = (k: string, e: string) => (lang === 'ko' ? k : e);

  if (/Write the brief/.test(said)) {
    const asked = [...(user.match(/Producer: [^\n]*/g) ?? [])].join(' ') || user;
    const kind = detectFormat(asked) ?? 'drama'; const K = FORMATS[kind];
    const eps = K.multi ? num(asked, /(\d+)\s*(?:부작|편|화|episodes?)/i, K.defaults.total_episodes) : 1;
    const hasLen = /(\d+)\s*(분|초)/.test(asked);
    const minutes = num(asked, /(\d+)\s*분/, 0), secs = num(asked, /분\s*(\d+)\s*초/, 0) || (/분/.test(asked) ? 0 : num(asked, /(\d+)\s*초/, 0));
    const length = hasLen ? minutes * 60 + secs : K.defaults.episode_seconds;
    const aspect = /9\s*:\s*16|세로|릴스|숏폼|쇼츠/.test(asked) ? '9:16' : /1\s*:\s*1/.test(asked) ? '1:1' : K.defaults.aspect;
    const names = { drama: ['데모 드라마', '막장 드라마', '과장된 감정과 반전'], film: ['데모 단편', '드라마', '차분한 여운'], ad: ['데모 광고', '아웃도어 광고', '고급스럽고 선명한'], musicvideo: ['데모 뮤직비디오', '뮤직비디오', '도시 야경의 감성'], vlog: ['데모 브이로그', '여행 브이로그', '편안하고 따뜻한'], short: ['데모 숏폼', '숏폼', '빠른 컷, 강한 훅'] }[kind];
    return JSON.stringify({ crew: 'producer_desk', say: ko(`요청을 ${K.label}(으)로 읽고 브리프를 작성했습니다. 가정한 부분만 확인해 주세요.`, 'Brief written. Please check the assumptions.'),
      series: { format: kind, title: names[0], genre: names[1], tone: names[2], logline: ko('한 가지 이야기가 선명하게 남는다.', 'One idea that stays.'), language: 'ko',
        total_episodes: eps, episode_seconds: length, clip_seconds: K.defaults.clip_seconds, aspect, resolution: /720/.test(asked) ? '720p' : /4k|2160/i.test(asked) ? '2160p' : '1080p',
        preset: /kimchy|김치/i.test(asked) ? 'h3_7plus1_kimchy' : /7\s*\+\s*1/.test(asked) ? 'h3_7plus1' : 'h3_7plus1_kimchy', sound_direction: ko('생활 소음과 또렷한 효과음', 'room tone and crisp effects'), music_direction: kind === 'musicvideo' ? ko('곡의 구간(인트로·벌스·후렴)에 맞춘 컷', 'cuts follow the song sections') : ko('긴장감 있는 현악 테마', 'tense strings theme') },
      brief: { text: ko(`${K.label} · ${eps > 1 ? `${eps}편 × ` : ''}${length}초. 클립은 ${K.defaults.clip_seconds}초 단위로 나눠 ${splitSeconds(length, K.defaults.clip_seconds).length}개 클립이 됩니다.`, 'A piece.'), assumptions: [ko(`작품 종류: ${K.label}`, `Kind: ${K.label}`), ko('해상도 1080p로 가정', 'Assumed 1080p')] } });
  }
  if (/casting now/.test(said)) {
    const SETS: Record<string, [string, string, string, string][]> = {
      drama: [['character', '서연', '30대 초반 여주인공, 단정한 단발', 'full body portrait of a Korean woman in her early 30s, neat bob haircut, beige coat, neutral grey background'], ['character', '서연 웨딩드레스', '같은 인물, 웨딩드레스', 'same woman in a white wedding dress, full body, neutral grey background'], ['character', '도현', '30대 후반 남주인공', 'full body portrait of a Korean man in his late 30s, dark suit, neutral grey background'], ['location', '재벌가 저택', '대리석 로비의 큰 저택', 'wide establishing shot of a luxurious mansion lobby with marble floor and a grand staircase'], ['prop', '낡은 편지', '비밀이 담긴 편지', 'close product shot of an old yellowed letter with a red wax seal on a wooden table']],
      ad: [['character', '지안', '30대 아웃도어 모델', 'full body portrait of a Korean woman model in her 30s wearing a technical outdoor jacket, neutral grey background'], ['prop', '트레일 재킷', '광고 제품 재킷', 'product shot of a navy technical outdoor jacket with a hood, studio light, plain background, no logo, no text'], ['location', '산 정상', '해 뜨는 산 정상', 'wide shot of a mountain summit at sunrise, soft golden light']],
      musicvideo: [['character', '하린', '메인 아티스트', 'full body portrait of a young Korean female singer in a stylish jacket, neutral grey background'], ['character', '하린 무대의상', '무대 의상 버전', 'same singer in a sparkling stage outfit, full body, neutral grey background'], ['location', '도시 옥상', '야경이 보이는 옥상', 'wide shot of a rooftop at night with the city lights behind'], ['prop', '마이크', '빈티지 마이크', 'product shot of a vintage microphone, dark background, rim light']],
      vlog: [['character', '진행자', '밝은 20대 진행자', 'portrait of a cheerful young Korean vlogger with a small camera, daylight'], ['location', '제주 해변', '맑은 날의 해변', 'wide shot of a sunny Jeju beach with black rocks'], ['prop', '작은 카메라', '손에 들고 찍는 카메라', 'product shot of a small handheld camera on a wooden table']],
      short: [['character', '민아', '활기찬 인물', 'portrait of an energetic young Korean woman, vertical framing, daylight'], ['location', '골목 카페', '아기자기한 카페', 'vertical shot of a cozy alley cafe entrance']],
      film: [['character', '주인공', '조용한 인물', 'portrait of a quiet middle-aged person, soft window light'], ['location', '오래된 방', '햇빛 드는 방', 'wide shot of an old room with dusty sunlight']],
    };
    const list = SETS[fmtId] ?? SETS.drama;
    return JSON.stringify({ crew: 'art', say: ko('필요한 인물·장소·소품을 정했습니다. 이미지는 아직 만들기 전입니다.', 'Cast proposed.'), references: list.map(([kind, name, description, prompt_en]) => ({ kind, name, description: ko(`${description}. ${prompt_en}`, prompt_en), ...(kind === 'character' && /웨딩|무대/.test(name) ? { variant_of: list[0][1] } : {}) })) });
  }
  if (/with the approved CAST: "series.synopsis"/.test(said)) {
    const cast = [...system.matchAll(/^ {2}(character|location|prop): ([^\n(\[]+?)(?: \(look of [^)]*\))? \[/gm)].map((m) => ({ kind: m[1], name: m[2].trim() }));
    const people = cast.filter((x) => x.kind !== 'location').map((x) => x.name), places = cast.filter((x) => x.kind === 'location').map((x) => x.name);
    return JSON.stringify({ crew: 'writer', say: ko(`${total}편 시나리오를 썼습니다. 승인된 캐스팅으로만 구성했습니다.`, 'Scenario written.'), series: { synopsis: ko('저택에서 시작된 비밀이 가족 전체를 흔든다.', 'A secret shakes the whole family.') },
      episodes: Array.from({ length: total }, (_, i) => ({ no: i + 1, title: ko(`${i + 1}화: ${['편지', '재회', '거짓말', '폭로', '이별'][i % 5]}`, `Ep ${i + 1}`), logline: ko(`서연이 새로운 진실을 알게 되고, 마지막에 반전이 터진다. (${i + 1}/${total})`, `Twist ${i + 1}`), cast: people.slice(0, 2 + (i % 2)), locations: places.length ? [places[i % places.length]] : [] })), suggest: [ko('3화를 더 자극적으로', 'Make ep 3 sharper')] });
  }
  if (/Use "episode_plan"/.test(said)) {
    const n = splitSeconds(epSec, clipSec).length, half = Math.ceil(n / 2);
    const names = [...system.matchAll(/^ {2}(character|location|prop): ([^\n(\[]+?)(?: \(look of [^)]*\))? \[/gm)].map((m) => ({ kind: m[1], name: m[2].trim() }));
    const lead = names.find((x) => x.kind === 'character')?.name ?? '', place = names.find((x) => x.kind === 'location')?.name ?? '';
    const total = n;
    const beat = (i: number): { en: string; kor: string; dialogue: string; sound: string; music: string; camera: string } => {
      const last = i === total - 1, first = i === 0;
      if (fmtId === 'ad') return last
        ? { en: 'Clean end card: the product centred on a plain background with the closing line', kor: '마지막 엔드카드: 제품과 카피', dialogue: ko('길 위의 모든 날씨를 입다.', 'Wear every weather.'), sound: 'soft wind fades out', music: 'brand sting', camera: 'static' }
        : { en: first ? 'Hook: the product close-up catching morning light, slow push-in' : `Benefit shot ${i}: the model uses the product outdoors, clear view of the product`, kor: first ? '훅: 아침 빛을 받는 제품 클로즈업' : `혜택 ${i}: 모델이 제품을 사용하는 장면`, dialogue: '', sound: 'wind, fabric rustle', music: 'rising acoustic pulse', camera: first ? 'close-up' : 'wide' };
      if (fmtId === 'musicvideo') {
        const part = i < 2 ? 'intro' : i % 6 < 3 ? 'verse' : 'chorus';
        return { en: part === 'chorus' ? 'Chorus: the artist performs full energy, fast camera moves, bright lights' : part === 'verse' ? 'Verse: the artist walks the city at night, intimate close-ups' : 'Intro: slow city lights, the artist from behind', kor: part === 'chorus' ? '후렴: 폭발적인 퍼포먼스' : part === 'verse' ? '벌스: 야경 속을 걷는 아티스트' : '인트로: 천천히 도시의 불빛', dialogue: part === 'intro' ? '' : ko(`가사 ${i}번째 줄`, `lyric line ${i}`), sound: 'city ambience, low bass', music: `${part} of the song`, camera: part === 'chorus' ? 'handheld' : 'medium close-up' };
      }
      if (fmtId === 'vlog') return { en: i % 2 === 0 ? 'Host talks to the camera, handheld, natural light' : 'B-roll: scenery and food details', kor: i % 2 === 0 ? '진행자가 카메라를 보고 이야기' : '풍경과 음식 디테일', dialogue: ko(`자, 여기는 ${i + 1}번째 장소예요.`, `So this is spot ${i + 1}.`), sound: 'waves, birds, light chatter', music: 'light acoustic guitar', camera: i % 2 === 0 ? 'handheld' : 'wide' };
      if (fmtId === 'short') return { en: first ? 'Hook: a sudden surprising action in the first second, vertical frame' : last ? 'Payoff: the surprise resolves with a smile, loop back to the start' : 'Fast cut: the idea develops', kor: first ? '훅: 첫 1초의 의외의 행동' : last ? '마무리: 반전 후 미소, 처음으로 이어지는 루프' : '빠른 컷: 아이디어 전개', dialogue: '', sound: 'pop, whoosh', music: 'trending upbeat loop', camera: 'handheld' };
      return { en: `Shot ${i + 1} of episode ${epNo}: the lead walks through the lobby, tense mood, handheld camera`, kor: `${epNo}화 ${i + 1}번 클립: 주인공이 로비를 걷는다`, dialogue: i % 2 === 0 ? `${lead}: ${ko('이게 다 거짓말이었다고?', 'It was all a lie?')}` : '', sound: 'footsteps on marble, distant murmur', music: 'low strings swell', camera: i % 3 === 0 ? 'wide' : 'medium close-up' };
    };
    const mk = (i: number) => { const x = beat(i); return { prompt_en: x.en, prompt_ko: x.kor, camera: x.camera, dialogue: x.dialogue ? (fmtId === 'drama' ? x.dialogue : x.dialogue) : '', sound: x.sound, music: x.music, cast: lead ? [lead] : [], location: place }; };
    return JSON.stringify({ crew: 'director', say: ko(`${epNo}화를 ${n}개 클립(각 ${clipSec}초)으로 구성했습니다.`, 'Episode written.'), episode_plan: { no: epNo, scenes: [
      { title: ko('도입', 'Opening'), summary: ko('긴장된 분위기로 시작', 'tense start'), clips: Array.from({ length: half }, (_, i) => mk(i)) },
      { title: ko('반전', 'Twist'), summary: ko('마지막 반전', 'final twist'), clips: Array.from({ length: n - half }, (_, i) => mk(half + i)) }] } });
  }
  if (/Write the song for this music video|The producer uploaded their own song/.test(said)) {
    const upload = /uploaded their own song/.test(said);
    const dur = upload ? num(said, /\((\d+)s\)/, epSec) : epSec;
    const music = { source: upload ? 'upload' : 'generate', language: lang, duration_sec: dur, sections: defaultSections(dur),
      ...(upload ? {} : { title: ko('데모 노래', 'Demo song'), style: 'upbeat K-pop, 120 BPM, bright synths, punchy drums, female vocal', bpm: 120,
        lyrics: ko('[verse]\n밤거리에 불이 켜지면\n나는 너에게 걸어가\n[chorus]\n멈추지 마, 이 순간을\n우리는 빛이 되어 달려가', '[verse]\nCity lights are coming on\nI walk to you\n[chorus]\nDo not stop this moment\nWe run as light') }) };
    return JSON.stringify({ crew: 'music', say: upload ? ko('노래의 구조(인트로·벌스·코러스…)를 제안했습니다. 구간은 화면에서 고칠 수 있습니다.', 'Structure proposed.') : ko('데모 노래의 스타일과 가사, 구조를 썼습니다. 이제 노래를 만들 수 있습니다.', 'Song written.'), music });
  }
  if (/approve|승인|좋아|OK/i.test(said)) return JSON.stringify({ crew: 'producer_desk', intent: 'approve', say: ko('승인으로 이해했습니다.', 'Understood as approval.') });
  return JSON.stringify({ crew: stage === 'episode' ? 'director' : 'producer_desk', intent: 'revise', say: ko('데모 작업팀은 수정 지시를 실제로 반영하지 않습니다. 실제 LLM을 설정하면 반영됩니다.', 'The demo crew does not apply changes. Set a real LLM in Settings.') });
};
