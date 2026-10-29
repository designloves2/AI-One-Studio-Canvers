// A scripted stand-in for the LLM, so the Director screen can be tried without any model. It reads the producer's first sentence for the numbers
// (episodes, length, aspect) and writes plausible, clearly fake content. Real work uses the LLM set in Settings.
import type { LlmFn } from './ai';
import { splitSeconds } from './series';

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
  const ko = (k: string, e: string) => (lang === 'ko' ? k : e);

  if (/Write the brief/.test(said)) {
    const eps = num(said, /(\d+)\s*(?:부작|편|화|episodes?)/i, 30), minutes = num(said, /(\d+)\s*분/, 1), sec = num(said, /(\d+)\s*초/, epSec);
    const length = /분/.test(said) ? minutes * 60 + (/분\s*(\d+)\s*초/.test(said) ? num(said, /분\s*(\d+)\s*초/, 0) : 0) : sec;
    return JSON.stringify({ crew: 'producer_desk', say: ko('요청대로 브리프를 작성했습니다. 가정한 부분만 확인해 주세요.', 'Brief written. Please check the assumptions.'),
      series: { title: ko('데모 드라마', 'Demo Drama'), genre: /막장/.test(said) ? '막장 드라마' : 'Drama', tone: ko('과장된 감정과 반전', 'big emotions and twists'), logline: ko('한 가족의 비밀이 하나씩 드러난다.', 'A family\'s secrets come out one by one.'), language: 'ko',
        total_episodes: eps, episode_seconds: length || 90, clip_seconds: 10, aspect: /9\s*:\s*16/.test(said) ? '9:16' : '16:9', resolution: /720/.test(said) ? '720p' : /4k|2160/i.test(said) ? '2160p' : '1080p',
        preset: /kimchy|김치/i.test(said) ? 'h3_7plus1_kimchy' : /7\s*\+\s*1/.test(said) ? 'h3_7plus1' : 'h3_7plus1_kimchy', sound_direction: ko('생활 소음, 과장된 효과음', 'room tone, punchy effects'), music_direction: ko('긴장감 있는 현악 테마', 'tense strings theme') },
      brief: { text: ko(`${eps}부작 ${length || 90}초 분량의 막장 드라마입니다. 편마다 반전과 클리프행어로 끝납니다. 클립은 10초 단위로 만들어 한 편을 ${splitSeconds(length || 90, 10).length}개 클립으로 나눕니다.`, 'A melodrama series.'), assumptions: [ko('해상도 1080p로 가정', 'Assumed 1080p'), ko('클립 길이 10초(가장 안정적인 길이)', 'Clip length 10 s')] } });
  }
  if (/casting now/.test(said)) {
    return JSON.stringify({ crew: 'art', say: ko('주연과 장소, 소품을 캐스팅했습니다. 이미지는 아직 만들기 전입니다.', 'Cast proposed.'), references: [
      { kind: 'character', name: ko('서연', 'Seoyeon'), description: ko('30대 초반 여주인공, 단정한 단발', 'lead, early 30s, neat bob'), prompt_en: 'full body portrait of a Korean woman in her early 30s, neat bob haircut, beige coat, neutral grey background' },
      { kind: 'character', name: ko('서연 웨딩드레스', 'Seoyeon wedding'), description: ko('같은 인물, 웨딩드레스', 'same person in a wedding dress'), prompt_en: 'same woman in a white wedding dress, full body, neutral grey background', variant_of: ko('서연', 'Seoyeon') },
      { kind: 'character', name: ko('도현', 'Dohyun'), description: ko('30대 후반 남주인공', 'male lead, late 30s'), prompt_en: 'full body portrait of a Korean man in his late 30s, dark suit, neutral grey background' },
      { kind: 'location', name: ko('재벌가 저택', 'Mansion'), description: ko('대리석 로비의 큰 저택', 'large mansion with a marble lobby'), prompt_en: 'wide establishing shot of a luxurious mansion lobby with marble floor and a grand staircase' },
      { kind: 'prop', name: ko('낡은 편지', 'Old letter'), description: ko('비밀이 담긴 편지', 'a letter holding a secret'), prompt_en: 'close product shot of an old yellowed letter with a red wax seal on a wooden table' }] });
  }
  if (/scenario of the whole series/.test(said)) {
    return JSON.stringify({ crew: 'writer', say: ko(`${total}편 시나리오를 썼습니다. 승인된 캐스팅으로만 구성했습니다.`, 'Scenario written.'), series: { synopsis: ko('저택에서 시작된 비밀이 가족 전체를 흔든다.', 'A secret shakes the whole family.') },
      episodes: Array.from({ length: total }, (_, i) => ({ no: i + 1, title: ko(`${i + 1}화: ${['편지', '재회', '거짓말', '폭로', '이별'][i % 5]}`, `Ep ${i + 1}`), logline: ko(`서연이 새로운 진실을 알게 되고, 마지막에 반전이 터진다. (${i + 1}/${total})`, `Twist ${i + 1}`) })), suggest: [ko('3화를 더 자극적으로', 'Make ep 3 sharper')] });
  }
  if (/Write episode/.test(said)) {
    const n = splitSeconds(epSec, clipSec).length, half = Math.ceil(n / 2);
    const names = [...system.matchAll(/^ {2}(character|location|prop): ([^\n(\[]+?)(?: \(look of [^)]*\))? \[/gm)].map((m) => ({ kind: m[1], name: m[2].trim() }));
    const lead = names.find((x) => x.kind === 'character')?.name ?? '', place = names.find((x) => x.kind === 'location')?.name ?? '';
    const mk = (i: number) => ({ prompt_en: `Shot ${i + 1} of episode ${epNo}: the lead walks through the lobby, tense mood, handheld camera`, prompt_ko: `${epNo}화 ${i + 1}번 클립: 주인공이 로비를 걷는다`, camera: i % 3 === 0 ? 'wide' : 'medium close-up', dialogue: i % 2 === 0 ? `${lead}: ${ko('이게 다 거짓말이었다고?', 'It was all a lie?')}` : '', sound: 'footsteps on marble, distant murmur', music: 'low strings swell', cast: lead ? [lead] : [], location: place });
    return JSON.stringify({ crew: 'director', say: ko(`${epNo}화를 ${n}개 클립(각 ${clipSec}초)으로 구성했습니다.`, 'Episode written.'), episode_plan: { no: epNo, scenes: [
      { title: ko('도입', 'Opening'), summary: ko('긴장된 분위기로 시작', 'tense start'), clips: Array.from({ length: half }, (_, i) => mk(i)) },
      { title: ko('반전', 'Twist'), summary: ko('마지막 반전', 'final twist'), clips: Array.from({ length: n - half }, (_, i) => mk(half + i)) }] } });
  }
  if (/approve|승인|좋아|OK/i.test(said)) return JSON.stringify({ crew: 'producer_desk', intent: 'approve', say: ko('승인으로 이해했습니다.', 'Understood as approval.') });
  return JSON.stringify({ crew: stage === 'episode' ? 'director' : 'producer_desk', intent: 'revise', say: ko('데모 작업팀은 수정 지시를 실제로 반영하지 않습니다. 실제 LLM을 설정하면 반영됩니다.', 'The demo crew does not apply changes. Set a real LLM in Settings.') });
};
