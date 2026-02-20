// 데이터 구조 예시
// sectionData = [{ title: '주 4.5일제', collapsed: false, boards: [...] }, ...]

function renderDOM() {
    const container = document.getElementById('main-container');
    container.innerHTML = '';

    sectionData.forEach((section, sIdx) => {
        const sNode = document.createElement('div');
        sNode.className = `kanban-section ${section.collapsed ? 'collapsed' : ''}`;
        
        sNode.innerHTML = `
            <div class="section-header">
                <span class="section-title" contenteditable="true">${section.title}</span>
                <button class="section-toggle-btn">${section.collapsed ? '▶' : '▼'}</button>
            </div>
            <div class="section-content">
                <div class="board-list"></div>
                <button class="add-board-btn">+ 보드 추가</button>
            </div>
        `;

        // 섹션 토글 이벤트
        sNode.querySelector('.section-toggle-btn').onclick = () => {
            sectionData[sIdx].collapsed = !sectionData[sIdx].collapsed;
            saveToServer();
        };

        // 섹션 내 보드들 렌더링 (기존 보드 렌더링 로직 삽입)
        const boardList = sNode.querySelector('.board-list');
        section.boards.forEach((board, bIdx) => {
            const bNode = document.createElement('div');
            bNode.className = 'drag-column';
            // ... (기존 보드 내부 HTML 및 카드 로직)
            boardList.appendChild(bNode);
        });

        container.appendChild(sNode);
    });
}
