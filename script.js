import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// [설정] 주신 데이터베이스 정보를 유지합니다.
const firebaseConfig = {
    databaseURL: "https://dihr-9bb0b-default-rtdb.firebaseio.com/",
    projectId: "dihr-9bb0b"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const boardRef = ref(db, 'workBoardData');

let boardData = [];
let isDragging = false; 

// [수신] 서버 데이터 실시간 동기화
onValue(boardRef, (snapshot) => {
    if (isDragging) return; // 사용자가 드래그 중일 때는 화면 갱신을 멈춤
    const data = snapshot.val();
    
    if (data) {
        // 하위 호환성 유지: 단순 문자열 아이템을 객체 형태로 변환
        boardData = data.map(col => ({
            ...col,
            items: (col.items || []).map(item => 
                typeof item === 'string' ? { text: item, color: '#ffffff' } : item
            )
        }));
    } else {
        boardData = [];
    }
    renderDOM();
}, (error) => {
    console.error("Firebase 로드 에러:", error);
});

// [저장] 서버로 데이터 전송
function saveToServer() {
    set(boardRef, boardData).catch(err => console.error("저장 실패:", err));
}

// [렌더링] 메인 화면 그리기
function renderDOM() {
    const mainList = document.getElementById('main-drag-list');
    const archiveList = document.getElementById('archive-drag-list');
    if (!mainList || !archiveList) return;

    mainList.innerHTML = '';
    archiveList.innerHTML = '';
    let archCount = 0;

    boardData.forEach((column, colIdx) => {
        const colNode = document.createElement('li');
        // 상하 접기 기능을 위해 collapsed 클래스 적용
        colNode.className = `drag-column ${column.collapsed ? 'collapsed' : ''}`;
        colNode.style.setProperty('--column-color', column.color || '#94a3b8');
        colNode.draggable =
