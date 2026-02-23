import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// [설정] Firebase 연결 정보
const firebaseConfig = { 
    databaseURL: "https://dihr-9bb0b-default-rtdb.firebaseio.com/", 
    projectId: "dihr-9bb0b" 
};
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const boardRef = ref(db, 'workBoardData');

let boardData = [];
let isDragging = false; // 드래그 시 실시간 업데이트 방해 방지

// [수신] 서버 데이터 실시간 동기화
onValue(boardRef, (snapshot) => {
    if (isDragging) return; // 드래그 중에는 렌더링 스킵
    const data = snapshot.val();
    
    // 데이터 구조 안전하게 정제 (하위 호환성 포함)
    boardData = Array.isArray(data) ? data.map(col => ({
        ...col,
        title: col.title || "제목 없음",
        items: Array.isArray(col.items) ? col.items.map(item => 
            typeof item === 'string' ? { text: item, color: '#ffffff' } : { ...item }
        ) : []
    })) : [];
    
    renderDOM();
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
        colNode.className = `drag-column ${column.collapsed ? 'collapsed' : ''}`;
        colNode.style.setProperty('--column-color', column.color || '#94a3b8');
        colNode.draggable = true;

        colNode.innerHTML = `
            <div class="header">
                <h1 contenteditable="true" class="col-title">${column.title}</h1>
                <div class="header-btns">
                    <button class="collapse-btn">${column.collapsed ? '▼' : '▲'}</button>
                    <button class="archive-btn">${column.archived ? '⬆️' : '📦'}</button>
                    <button class="delete-btn">×</button>
                </div>
            </div>
            <div class="color-picker" style="padding:0 12px 10px; display:flex; gap:5px;">
                ${['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6'].map(c => 
                    `<div class="color-dot" style="background:${c}; width:12px; height:12px; border-radius:50%; cursor:pointer;"></div>`
                ).join('')}
            </div>
            <ul class="item-list" style="min-height:30px; list-style:none; padding:0;"></ul>
            <div class="add-btn-group" style="padding:10px;">
                <button class="add-item-btn" style="width:100%; cursor:pointer;">+ 할 일 추가</button>
            </div>
        `;

        // --- 보드 헤더 이벤트 ---
        const titleNode = colNode.querySelector('.col-title');
        // 보드 제목 실시간 반영 (초기화 방지)
        titleNode.oninput = (e) => { boardData[colIdx].title = e.target.textContent; };
        titleNode.onblur = () => { saveToServer(); };

        // 보드 기능 버튼
        colNode.querySelector('.collapse-btn').onclick = () => { boardData[colIdx].collapsed = !boardData[colIdx].collapsed; saveToServer(); };
        colNode.querySelector('.archive-btn').onclick = () => { boardData[colIdx].archived = !boardData[colIdx].archived; saveToServer(); };
        colNode.querySelector('.delete-btn').onclick = () => { if (confirm('보드를 삭제하시겠습니까?')) { boardData.splice(colIdx, 1); saveToServer(); } };
        
        // 보드 테두리 색상 변경
        colNode.querySelectorAll('.color-dot').forEach((dot, i) => {
            const colors = ['#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6'];
            dot.onclick = () => { boardData[colIdx].color = colors[i]; saveToServer(); };
        });

        // 보드 드래그 시작
        colNode.ondragstart = (e) => {
            if(e.target.closest('.drag-item')) return;
            isDragging = true;
            e.dataTransfer.setData('type', 'col');
            e.dataTransfer.setData('from', colIdx);
        };

        // --- 카드(아이템) 이벤트 ---
        colNode.querySelector('.add-item-btn').onclick = () => {
            if (!boardData[colIdx].items) boardData[colIdx].items = [];
            boardData[colIdx].items.push({ text: '새 업무를 입력하세요', color: '#ffffff' });
            saveToServer();
        };

        const listEl = colNode.querySelector('.item-list');
        (column.items || []).forEach((item, itemIdx) => {
            const itemEl = document.createElement('li');
            itemEl.className = 'drag-item';
            itemEl.style.backgroundColor = item.color || '#ffffff';
            itemEl.draggable = true;
            itemEl.innerHTML = `
                <div contenteditable="true" class="item-text" style="outline:none;">${item.text}</div>
                <div class="item-color-picker">
                    ${['#fee2e2','#fef3c7','#d1fae5','#dbeafe','#ffffff'].map(c => 
                        `<div class="item-color-dot" style="background:${c}"></div>`
                    ).join('')}
                    <button class="item-del-btn" style="border:none; color:red; cursor:pointer; background:none;">×</button>
                </div>
            `;

            const textNode = itemEl.querySelector('.item-text');
            // [중요] 카드 텍스트 실시간 반영 (초기화 방지 핵심)
            textNode.oninput = (e) => { boardData[colIdx].items[itemIdx].text = e.target.textContent; };
            textNode.onblur = () => { saveToServer(); };

            // 카드 개별 삭제
            itemEl.querySelector('.item-del-btn').onclick = (e) => {
                e.stopPropagation();
                boardData[colIdx].items.splice(itemIdx, 1);
                saveToServer();
            };

            // 카드 개별 색상 변경
            itemEl.querySelectorAll('.item-color-dot').forEach((dot, i) => {
                const colors = ['#fee2e2','#fef3c7','#d1fae5','#dbeafe','#ffffff'];
                dot.onclick = (e) => {
                    e.stopPropagation();
                    boardData[colIdx].items[itemIdx].color = colors[i];
                    saveToServer();
                };
            });

            // 카드 드래그 시작
            itemEl.ondragstart = (e) => {
                e.stopPropagation();
                isDragging = true;
                e.dataTransfer.setData('type', 'item');
                e.dataTransfer.setData('info', JSON.stringify({fCol: colIdx, fIdx: itemIdx}));
            };
            itemEl.ondragend = () => { isDragging = false; };

            listEl.appendChild(itemEl);
        });

        // 보드 위로 드롭 처리 (카드 이동 및 보드 이동)
        colNode.ondragover = (e) => { e.preventDefault(); };
        colNode.ondrop = (e) => {
            e.preventDefault();
            const type = e.dataTransfer.getData('type');
            
            if (type === 'item') {
                const info = JSON.parse(e.dataTransfer.getData('info'));
                const moving = boardData[info.fCol].items.splice(info.fIdx, 1)[0];
                if (!boardData[colIdx].items) boardData[colIdx].items = [];
                boardData[colIdx].items.push(moving);
                isDragging = false;
                saveToServer();
            } else if (type === 'col') {
                const fromIdx = e.dataTransfer.getData('from');
                if (fromIdx !== "" && fromIdx != colIdx) {
                    const temp = boardData.splice(fromIdx, 1)[0];
                    boardData.splice(colIdx, 0, temp);
                    isDragging = false;
                    saveToServer();
                }
            }
        };

        // 보관함 분기 렌더링
        if (column.archived) {
            archiveList.appendChild(colNode);
            archCount++;
        } else {
            mainList.appendChild(colNode);
        }
    });
    
    // 완료함 카운트 업데이트
    const countEl = document.getElementById('archive-count');
    if (countEl) countEl.textContent = archCount;
}

// --- 전역 UI 이벤트 ---

// 1. 보관함 서랍 열기/닫기
const archiveHeader = document.getElementById('archive-header');
if (archiveHeader) {
    archiveHeader.onclick = () => {
        document.getElementById('archive-section').classList.toggle('open');
    };
}

// 2. 새 업무 보드 추가
const addColBtn = document.getElementById('add-col-btn');
if (addColBtn) {
    addColBtn.onclick = () => {
        const title = prompt('새 보드 제목을 입력하세요:');
        if (title && title.trim()) {
            boardData.push({
                title: title.trim(),
                items: [],
                collapsed: false,
                archived: false,
                color: '#94a3b8'
            });
            saveToServer();
        }
    };
}
