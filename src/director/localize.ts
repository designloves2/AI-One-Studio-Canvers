// The workflow rules (workflow.ts) write their reasons in English so they can be tested; this shows them in the UI language.
import { t } from '../i18n';

const RULES: [RegExp, (m: RegExpExecArray) => string][] = [
  [/^The brief is empty\.$/, () => '브리프가 비어 있습니다.'],
  [/^The series plan has (\d+) episodes, the brief says (\d+)\.$/, (m) => `시리즈 기획은 ${m[1]}편인데 브리프는 ${m[2]}편입니다.`],
  [/^Some episodes have no title or story line yet\.$/, () => '제목도 줄거리도 없는 편이 있습니다.'],
  [/^There is no cast yet\. Ask for casting, or tell the crew to go without\.$/, () => '아직 섭외한 인물·장소·소품이 없습니다. 섭외를 요청하거나, 없이 진행하라고 말해 주세요.'],
  [/^(\d+) of (\d+) cast entries have no image yet \((.*)\)\. Generate them first\.$/, (m) => `섭외 ${m[2]}개 중 ${m[1]}개에 아직 이미지가 없습니다 (${m[3]}). 먼저 이미지를 만들어 주세요.`],
  [/^Episode (\d+) has no clips yet\.$/, (m) => `${m[1]}편에 아직 클립이 없습니다.`],
  [/^The clips add up to ([\d.]+) s, the episode is ([\d.]+) s\.$/, (m) => `클립 합계가 ${m[1]}초인데 한 편은 ${m[2]}초입니다.`],
  [/^A clip is longer than ([\d.]+) s\.$/, (m) => `${m[1]}초보다 긴 클립이 있습니다.`],
  [/^A clip has no picture description yet\.$/, () => '화면 묘사가 없는 클립이 있습니다.'],
  [/^The canvas for this episode has not been built yet\.$/, () => '이 편의 캔버스가 아직 만들어지지 않았습니다.'],
  [/^(\d+) of (\d+) clips have no generated result yet\.$/, (m) => `클립 ${m[2]}개 중 ${m[1]}개는 아직 생성된 결과가 없습니다.`],
  [/^Tell the crew what to make first\.$/, () => '먼저 만들고 싶은 것을 작업팀에게 말해 주세요.'],
  [/^The crew is still working on this step\.$/, () => '작업팀이 아직 이 단계를 작업 중입니다.'],
  [/^Nothing is waiting for approval\.$/, () => '승인을 기다리는 것이 없습니다.'],
  [/^The whole series is finished\.$/, () => '시리즈 전체가 완성되었습니다.'],
];

/** `msg` in Korean when the UI is Korean and the sentence is one of the known rules; otherwise unchanged */
export function localizeMsg(msg: string): string {
  if (t('Casting') === 'Casting') return msg;   // the UI is English
  for (const [re, f] of RULES) { const m = re.exec(msg); if (m) return f(m); }
  return msg;
}
