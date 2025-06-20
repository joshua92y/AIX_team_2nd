/**
 * 애플리케이션 상태 관리
 */
class StateManager {
  constructor() {
    this.state = {
      currentUser: null,
      currentAnalysis: null,
      currentSession: null,
      isLoading: false,
      error: null,
      ui: {
        activeSection: 'main',
        showChatHistory: false,
        showAnalysisReport: false
      }
    };
    
    this.listeners = [];
  }

  /**
   * 상태 변경 리스너 등록
   */
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * 상태 변경 알림
   */
  notify() {
    this.listeners.forEach(listener => listener(this.state));
  }

  /**
   * 상태 업데이트
   */
  setState(newState) {
    this.state = { ...this.state, ...newState };
    this.notify();
  }

  /**
   * 특정 상태 업데이트
   */
  updateState(path, value) {
    const keys = path.split('.');
    let current = this.state;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    this.notify();
  }

  /**
   * 사용자 정보 설정
   */
  setCurrentUser(user) {
    this.setState({ currentUser: user });
  }

  /**
   * 현재 분석 설정
   */
  setCurrentAnalysis(analysis) {
    this.setState({ currentAnalysis: analysis });
  }

  /**
   * 현재 세션 설정
   */
  setCurrentSession(session) {
    this.setState({ currentSession: session });
  }

  /**
   * 로딩 상태 설정
   */
  setLoading(isLoading) {
    this.setState({ isLoading });
  }

  /**
   * 에러 설정
   */
  setError(error) {
    this.setState({ error });
  }

  /**
   * UI 상태 업데이트
   */
  updateUI(uiState) {
    this.setState({ ui: { ...this.state.ui, ...uiState } });
  }

  /**
   * 활성 섹션 설정
   */
  setActiveSection(section) {
    this.updateUI({ activeSection: section });
  }

  /**
   * 채팅 히스토리 표시/숨김
   */
  toggleChatHistory(show) {
    this.updateUI({ showChatHistory: show });
  }

  /**
   * 분석 리포트 표시/숨김
   */
  toggleAnalysisReport(show) {
    this.updateUI({ showAnalysisReport: show });
  }

  /**
   * 상태 초기화
   */
  reset() {
    this.setState({
      currentAnalysis: null,
      currentSession: null,
      isLoading: false,
      error: null,
      ui: {
        activeSection: 'main',
        showChatHistory: false,
        showAnalysisReport: false
      }
    });
  }

  /**
   * 현재 상태 가져오기
   */
  getState() {
    return { ...this.state };
  }

  /**
   * 특정 상태 값 가져오기
   */
  getStateValue(path) {
    const keys = path.split('.');
    let current = this.state;
    
    for (const key of keys) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[key];
    }
    
    return current;
  }

  /**
   * 상태 저장 (localStorage)
   */
  saveToStorage() {
    try {
      const stateToSave = {
        currentUser: this.state.currentUser,
        currentAnalysis: this.state.currentAnalysis,
        currentSession: this.state.currentSession,
        ui: this.state.ui
      };
      localStorage.setItem('locaai_state', JSON.stringify(stateToSave));
    } catch (error) {
      console.error('상태 저장 실패:', error);
    }
  }

  /**
   * 상태 복원 (localStorage)
   */
  loadFromStorage() {
    try {
      const savedState = localStorage.getItem('locaai_state');
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        this.setState({
          currentUser: parsedState.currentUser,
          currentAnalysis: parsedState.currentAnalysis,
          currentSession: parsedState.currentSession,
          ui: parsedState.ui
        });
      }
    } catch (error) {
      console.error('상태 복원 실패:', error);
    }
  }

  /**
   * 상태 변경 시 자동 저장
   */
  enableAutoSave() {
    this.subscribe(() => {
      this.saveToStorage();
    });
  }
}

// 싱글톤 인스턴스 생성
const stateManager = new StateManager();

export default stateManager;
