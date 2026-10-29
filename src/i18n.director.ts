// Korean texts of the Director screen (English text is the key, like i18n.cards.ts). Merged into the dictionary in i18n.ts.
export const KO_DIRECTOR: Record<string, string> = {
  // the staff
  'Producer desk': '제작 데스크', Writer: '작가', Director: '디렉터', Cinematographer: '촬영 감독', 'Art department': '미술·캐스팅', 'Sound director': '음향 감독', 'Music director': '음악 감독',
  // steps
  Brief: '브리프', Casting: '캐스팅', Scenario: '시나리오', Episode: '편 작성', Generate: '생성', Review: '검토', 'Next episode': '다음 편',
  episodes: '편', clips: '클립', Episodes: '편수', Clips: '클립', 'per episode': '/ 편',
  waiting: '대기 중', 'the crew is working…': '작업팀이 작업 중…', 'waiting for your approval': '승인을 기다리는 중', approved: '승인됨', failed: '실패', finished: '완료', blocked: '막힘',
  // welcome / chat
  'You are the producer. Say what you want to make in the chat below; the crew (writer, director, art, sound, music) does the work and asks for your approval at each step.': '당신은 제작자입니다. 아래 채팅창에 만들고 싶은 것을 말하면 작업팀(작가·감독·미술·음향·음악)이 작업하고, 단계마다 승인을 받습니다.',
  'Try it without an LLM (scripted demo crew)': 'LLM 없이 체험해 보기 (데모 작업팀)',
  'The crew is working…': '작업팀이 작업 중…', 'The crew is working. Wait until it is done.': '작업팀이 작업 중입니다. 끝날 때까지 기다려 주세요.',
  'Enter to send, Shift+Enter for a new line': 'Enter 전송, Shift+Enter 줄바꿈', Approve: '승인', 'Try again': '다시 시도', 'Not yet': '아직 안 됨', 'To change something, tell the crew below.': '고칠 것이 있으면 아래에 말로 지시하세요.',
  'Tell the crew what to do, or what to change…': '작업팀에게 할 일이나 고칠 점을 말하세요…', 'Say what you want to make…': '만들고 싶은 것을 말하세요…', Send: '보내기',
  // clip status, casting groups, meters
  draft: '초안', ready: '준비됨', queued: '대기', generating: '생성 중', review: '검토', done: '완료',
  Actors: '배우', Locations: '장소', Props: '소품', 'images ready': '이미지 완료', 'clips generated': '클립 생성됨',
  // register a result as an asset (right-click)
  'Register as asset': '에셋으로 등록', 'Asset name': '에셋 이름', 'Write it in a prompt as': '프롬프트에는 이렇게 씁니다', 'Use letters, numbers, _ and Korean': '글자, 숫자, _ 와 한글을 쓸 수 있습니다',
  'Characters that cannot be used were replaced with _': '쓸 수 없는 문자는 _ 로 바꿨습니다', 'This image was already registered as': '같은 이미지가 이미 등록되어 있습니다:', Category: '카테고리', Register: '등록', Registered: '등록했습니다',
  // model settings of the Director
  'Model settings': '모델 설정', 'Used by the Director crew only': '디렉터 작업팀 전용', 'Director LLM': '디렉터 LLM', 'Main LLM': '메인 LLM', 'no model chosen': '모델 미선택',
  'The Director crew follows the main LLM. Untick to give it its own backend / model (a stronger model writes better scenarios).': '디렉터 작업팀이 메인 LLM을 따릅니다. 체크를 풀면 디렉터 전용 백엔드/모델을 쓸 수 있습니다 (더 강한 모델이 시나리오를 더 잘 씁니다).',
  // steps you can click, episode strip, batches, seeds
  'not started': '시작 전', writing: '작성 중', 'waiting for approval': '승인 대기', canvas: '캔버스', 'Opens when the scenario is approved': '시나리오를 승인하면 열립니다', 'Look at this step': '이 단계 보기',
  'Several episodes together': '여러 편 함께', All: '전체', 'Not started': '시작 전인 편', 'At this step': '이 단계인 편', None: '해제', 'Tick episodes above': '위에서 편을 체크하세요',
  'Start writing': '작성 시작', 'This episode has not been started': '이 편은 아직 시작하지 않았습니다', 'Start writing this episode': '이 편 작성 시작',
  'The crew writes its clips from the scenario and the cast. You can start several episodes at once with "Several episodes together".': '작업팀이 시나리오와 출연진으로 이 편의 클립을 씁니다. "여러 편 함께"로 여러 편을 한꺼번에 시작할 수도 있습니다.',
  'Select this clip': '이 클립 선택', Seed: '시드', random: '무작위', 'A new random seed': '새 무작위 시드', 'Make this clip again with a new seed': '새 시드로 이 클립만 다시 생성', 'Make again': '다시 생성',
  'Which episodes': '대상 편', 'This episode': '이 편', 'Ticked episodes': '체크한 편', 'Every episode at this step': '이 단계의 모든 편', 'If an episode fails': '편이 실패하면',
  'Stop at the first failure': '처음 실패에서 멈춤', 'Skip the failed episode and go on': '실패한 편은 건너뛰고 계속', 'Generate the ticked clips': '체크한 클립 생성', 'with new seeds': '새 시드로',
  'Tick all clips': '클립 전체 선택', 'Clips without a result': '결과 없는 클립', Batch: '배치', skipped: '건너뜀', cancelled: '취소됨',
  'Go back to this step': '이 단계로 되돌리기', 'You are looking at a step that is not the current one. Tell the crew below what to change, or go back to it.': '지금 진행 중인 단계가 아닌 곳을 보고 있습니다. 고칠 것은 아래에 말로 지시하거나, 이 단계로 되돌리세요.',
  'Generate these now? Generating uses the GPU and takes time.': '이것들을 지금 생성할까요? 생성은 GPU를 쓰고 시간이 걸립니다.', ' ep': '화', 'This episode is not at the generate step.': '이 편은 생성 단계가 아닙니다.',
  // cast follows, choosing images, generating
  Cast: '출연진', 'Choose the image': '이미지 고르기', Gallery: '갤러리', 'The Gallery is empty.': '갤러리가 비어 있습니다.', 'Change image': '이미지 바꾸기', 'Choose from Library / Gallery': '라이브러리 / 갤러리에서 고르기',
  'Reference images connected': '연결한 참조 이미지', files: '개 파일', 'Not included': '포함하지 못한 것',
  'How do you want to make this episode?': '이 편을 어떻게 만들까요?', Automatic: '자동', Manual: '수동',
  'The crew connects the cast images, generates every approved clip one after another, and shows the results here.': '작업팀이 출연진 이미지를 알아서 연결하고, 승인된 클립을 차례로 생성한 뒤 결과를 여기에 보여 드립니다.',
  'You decide: open the episode in the Canvas, or take it as a file (ZIP) and make it yourself.': '직접 정합니다: 이 편을 캔버스에서 열거나, 파일(ZIP)로 받아서 직접 진행합니다.',
  'Switch to manual': '수동으로 바꾸기', 'Switch to automatic': '자동으로 바꾸기', 'Start generating': '생성 시작', 'Take it as a file (ZIP)': '파일(ZIP)로 받기',
  'Before it starts you will be asked once. Generating uses the GPU and takes time; it stops at the first failure.': '시작하기 전에 한 번 물어봅니다. 생성은 GPU를 쓰고 시간이 걸리며, 처음 실패하면 멈춥니다.',
  'Open the episode in the Canvas to run it there, or take it as a file. When you have results, press "Sync results".': '캔버스에서 열어 거기서 실행하거나 파일로 받으세요. 결과가 생기면 "결과 가져오기"를 누르세요.',
  // brief
  'Per episode': '편당 길이', 'Total length': '전체 분량', 'Clips per episode': '편당 클립', 'Aspect · resolution': '화면 비율 · 해상도', Rendering: '생성 방식', Concept: '컨셉',
  'How one episode is cut': '한 편은 이렇게 나눕니다', 'Every episode is written as clips of this length, so each clip renders at the length the model handles best.': '모든 편은 이 길이의 클립으로 씁니다. 클립마다 모델이 가장 안정적으로 만드는 길이가 됩니다.',
  'I decided these for you': '제가 이렇게 정했습니다', 'Tell me in the chat if any of them is wrong.': '틀린 것이 있으면 채팅으로 말씀해 주세요.',
  Title: '제목', Genre: '장르', Tone: '분위기', Picture: '화면', Sound: '음향', Music: '음악', Dialogue: '대사',
  'Assumptions (tell me if wrong)': '가정한 것 (틀리면 말해 주세요)', Continues: '이어서 만드는 작품',
  // casting
  'Actors, locations and props are cast first; the story is written with them.': '배우·장소·소품을 먼저 섭외하고, 그 위에서 이야기를 씁니다.',
  'Make the cast images': '섭외 이미지 만들기', 'No image yet': '아직 이미지 없음', Actor: '배우', Location: '장소', Prop: '소품', 'look of': '의상/모습:', Asset: '에셋', Failed: '실패',
  'Every cast entry already has an image.': '모든 섭외 항목에 이미지가 이미 있습니다.', 'Make the cast images now? Generating uses the GPU and takes time.': '섭외 이미지를 지금 만들까요? 생성은 GPU를 쓰고 시간이 걸립니다.', 'Cancelled.': '취소했습니다.',
  // canvas
  'The episode is set up as a canvas': '이 편을 캔버스로 구성했습니다', 'with the shared 7+1 card': '공용 7+1 카드 포함', 'The canvas is being built…': '캔버스를 구성하는 중…',
  // side menu
  'Director projects': '디렉터 프로젝트', 'Start a new project by writing in the chat. To continue an earlier one, name it: "…1편에 이어서 2편을 만들자".': '새 프로젝트는 채팅창에 쓰면 시작됩니다. 이전 작품에 이어 만들려면 이름을 말하세요: "…1편에 이어서 2편을 만들자".',
};
