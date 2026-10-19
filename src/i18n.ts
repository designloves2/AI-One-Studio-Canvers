import { create } from 'zustand';
import { KO_CARDS } from './i18n.cards';

export type Lang = 'ko' | 'en';

const KO: Record<string, string> = {
  // chrome
  Canvas: '캔버스', Simple: '심플', Settings: '설정', Gallery: '갤러리', Nodes: '노드', Assets: '에셋',
  Models: '모델', Search: '검색', 'Search nodes…': '노드 검색…', Run: '실행', Stop: '중지', 'Run all': '전체 실행',
  Save: '저장', 'Save as': '다른 이름으로 저장', Open: '열기', New: '새로 만들기', Undo: '실행 취소', Redo: '다시 실행',
  Delete: '삭제', Duplicate: '복제', Group: '그룹', Ungroup: '그룹 해제', Lock: '잠금', Unlock: '잠금 해제',
  'Zoom to fit': '화면에 맞춤', Close: '닫기', Apply: '적용', Cancel: '취소', Download: '다운로드',
  'Add node': '노드 추가', 'Clear results': '결과 지우기', 'Copy to input': '입력으로 복사',
  // settings
  'ComfyUI connection': 'ComfyUI 연결', 'Server address': '서버 주소', 'Same origin (proxy)': '동일 출처(프록시)',
  Test: '테스트', Connected: '연결됨', 'Not connected': '연결 안 됨', Language: '언어',
  'LLM backend': 'LLM 백엔드', 'Local GGUF (llama.cpp)': '로컬 GGUF (llama.cpp)', 'ComfyUI TextGenerate': 'ComfyUI TextGenerate',
  OpenRouter: 'OpenRouter', 'Connect Custom': 'Connect Custom (OpenAI 호환)', 'GGUF model': 'GGUF 모델', 'Vision projector (mmproj)': '비전 프로젝터 (mmproj)',
  'Text encoder': '텍스트 인코더', 'Loader type': '로더 타입', 'API key': 'API 키', 'Text model': '텍스트 모델', 'Vision model': '비전 모델',
  'Base URL': '기본 URL', Model: '모델', 'Context size': '컨텍스트 크기', 'Connect & test': '연결 및 테스트',
  'Key is kept in server memory only.': '키는 서버 메모리에만 보관됩니다.', 'Key stored on server': '서버에 키 저장됨',
  Temperature: '온도', 'Max tokens': '최대 토큰', 'Save LLM settings': 'LLM 설정 저장', Saved: '저장됨',
  'Output folder': '출력 폴더', 'Image models': '이미지 모델',
  // nodes (titles)
  Prompt: '프롬프트', 'Prompt Concatenator': '프롬프트 결합', 'Prompt Enhancer': '프롬프트 강화', 'Image Describer': '이미지 설명',
  'LLM (TJ)': 'LLM (TJ)', 'Image Generate': '이미지 생성', 'Image Edit': '이미지 편집', Inpaint: '인페인트', Outpaint: '아웃페인트',
  'Remove Background': '배경 제거', 'Face Swap': '얼굴 교체', Upscale: '업스케일', 'Video Generate': '비디오 생성',
  Crop: '자르기', Resize: '크기 조정', Blur: '블러', Levels: '레벨', 'Rotate and flip': '회전/반전', 'Color correction': '색 보정',
  Sharpen: '선명하게', Grayscale: '흑백', Threshold: '임계값', Posterize: '포스터화', 'Hue Rotate': '색상 회전', Vignette: '비네트',
  Pixelate: '픽셀화', Blend: '블렌드', Invert: '반전', Channels: '채널', 'Color palette': '색상 팔레트', 'Extract Video Frame': '비디오 프레임 추출',
  'Matte Grow/Shrink': '마스크 확장/축소', Painter: '페인터', Import: '가져오기', Export: '내보내기', Preview: '미리보기', Router: '라우터',
  Compare: '비교', 'Sticky Note': '메모', Number: '숫자', Text: '텍스트', Toggle: '토글', Seed: '시드',
  // categories
  'Text / LLM': '텍스트 / LLM', Image: '이미지', Video: '비디오', Edit: '편집', Matte: '마스크', Utility: '유틸리티', Data: '데이터',
  // node bodies
  'Replace…': '바꾸기…', 'Choose file…': '파일 선택…', 'or drop a file on the canvas': '또는 캔버스에 파일을 끌어다 놓으세요', 'Connect A and B': 'A와 B를 연결하세요',
  'Nothing connected yet': '아직 연결된 것이 없습니다', Advanced: '고급', 'Open painter': '페인터 열기', planned: '예정',
  Mask: '마스크', Paint: '페인트', Brush: '브러시', Eraser: '지우개', Size: '크기', Fill: '채우기', Empty: '비우기', Clear: '초기화',
  'Aspect ratio': '화면 비율', 'Size (MP)': '크기 (MP)', Steps: '스텝', Guidance: '가이던스', Sampler: '샘플러', Scheduler: '스케줄러', 'Negative prompt': '네거티브 프롬프트',
  Batch: '배치', 'LoRA 1': 'LoRA 1', 'LoRA 2': 'LoRA 2', 'LoRA 1 strength': 'LoRA 1 강도', 'LoRA 2 strength': 'LoRA 2 강도', Denoise: '디노이즈',
  'System prompt': '시스템 프롬프트', 'Temperature (0 = settings)': '온도 (0 = 설정값)', Guidelines: '지침', 'Write in English': '영어로 작성', For: '용도',
  'Describe as': '설명 방식', 'Extra guidelines': '추가 지침', Separator: '구분자', 'Add-ons': '추가', Texts: '텍스트', Images: '이미지',   'Left px': '왼쪽 px', 'Top px': '위 px', 'Right px': '오른쪽 px', 'Bottom px': '아래 px', 'File name': '파일 이름', Note: '메모', Value: '값', Scale: '배율', 'Final scale': '최종 배율',
  Radius: '반경', Amount: '양', Level: '레벨', Degrees: '각도', Strength: '강도', Softness: '부드러움', 'Block size': '블록 크기', Opacity: '불투명도', Mode: '모드',
  Brightness: '밝기', Contrast: '대비', Saturation: '채도', Warmth: '색온도', Gamma: '감마', 'Black point': '블랙 포인트', 'White point': '화이트 포인트', Channel: '채널',
  'Canvas width': '캔버스 너비', 'Canvas height': '캔버스 높이', Feather: '페더', 'Position %': '위치 %', Colors: '색상',   // simple mode
  Generate: '생성', Reference: '참조', Options: '옵션', Enhance: '프롬프트 강화', 'Use as reference': '참조로 사용', 'To canvas': '캔버스로',
  'Describe your image…': '만들고 싶은 이미지를 설명하세요…', 'Describe what you want below and press Generate.': '아래에 원하는 것을 적고 생성을 누르세요.',
  'Leave empty to use the built-in proxy (recommended).': '비워두면 내장 프록시를 사용합니다 (권장).',
  'Write a prompt first.': '먼저 프롬프트를 입력하세요.', Restore: '되돌리기',
  'Load workflow (API JSON)…': '워크플로우 불러오기 (API JSON)…', 'Replace workflow…': '워크플로우 바꾸기…', 'ComfyUI Workflow': 'ComfyUI 워크플로우', Workflow: '워크플로우', 'Prompt field': '프롬프트 칸', 'Image 1 field': '이미지 1 칸', 'Image 2 field': '이미지 2 칸', 'Video field': '비디오 칸', 'Seed field': '시드 칸',
  'Music models': '음악 모델', 'Music Generate': '음악 생성', Audio: '오디오', 'Length (s)': '길이 (초)', Key: '키', Lyrics: '가사', Style: '스타일',
  'Video models': '비디오 모델', 'First frame': '첫 프레임', 'Last frame': '마지막 프레임', 'Stage-2 sigmas': '2단계 시그마',
  'Model downloads': '모델 다운로드', 'Start the server with COMFY_DIR=<ComfyUI folder> to download here. Links below open in your browser.': '서버를 COMFY_DIR=<ComfyUI 폴더> 로 실행하면 여기서 바로 내려받습니다. 지금은 링크가 브라우저에서 열립니다.',
  'Open melody editor': '멜로디 에디터 열기', 'empty — open the editor': '비어 있음 — 에디터를 여세요', Play: '재생', Record: '녹음', notes: '음표', bars: '마디', Bars: '마디', 'overlapping notes dropped': '겹친 음 제외', 'Melody Editor': '멜로디 에디터', 'Melody (ABC)': '멜로디 (ABC)',
  'Click = add note · drag = move · drag right edge (or Shift+drag) = length · double-click / right-click = delete · Space = play': '클릭 = 음 추가 · 드래그 = 이동 · 오른쪽 끝 드래그(또는 Shift+드래그) = 길이 · 더블클릭/우클릭 = 삭제 · 스페이스 = 재생',
  // messages
  'Nothing here yet.': '아직 아무것도 없습니다.', 'Connect an input first.': '먼저 입력을 연결하세요.',
};
for (const [k, v] of Object.entries(KO_CARDS)) if (!(k in KO)) KO[k] = v;

interface LangState { lang: Lang; setLang: (l: Lang) => void }

const read = (): Lang => {
  try { return localStorage.getItem('canvers.lang') === 'en' ? 'en' : 'ko'; } catch { return 'ko'; }
};

export const useLang = create<LangState>((set) => ({
  lang: read(),
  setLang: (lang) => {
    try { localStorage.setItem('canvers.lang', lang); } catch { /* ignore */ }
    set({ lang });
  },
}));

/** Translate a UI string. English text is the key; unknown strings fall through unchanged. */
export function t(key: string): string {
  return useLang.getState().lang === 'ko' ? (KO[key] ?? key) : key;
}

/** Hook that re-renders on language change and returns t(). */
export function useT(): (key: string) => string {
  const lang = useLang((s) => s.lang);
  return (key) => (lang === 'ko' ? (KO[key] ?? key) : key);
}
