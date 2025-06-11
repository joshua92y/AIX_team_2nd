// Korean GIS Map Widget with Passive Touch Events
// 터치 이벤트 성능 최적화

(function() {
    'use strict';
    
    // 터치 이벤트를 passive로 설정하는 함수
    function addPassiveEventListeners() {
        // 기존 touchstart 이벤트 리스너들을 passive로 변경
        const originalAddEventListener = Element.prototype.addEventListener;
        
        Element.prototype.addEventListener = function(type, listener, options) {
            if (type === 'touchstart' || type === 'touchmove') {
                if (typeof options === 'boolean') {
                    options = { capture: options, passive: true };
                } else if (typeof options === 'object' && options !== null) {
                    options.passive = true;
                } else {
                    options = { passive: true };
                }
            }
            
            return originalAddEventListener.call(this, type, listener, options);
        };
    }
    
    // DOM이 로드되면 실행
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addPassiveEventListeners);
    } else {
        addPassiveEventListeners();
    }
    
    // OpenLayers 지도 초기화 후 터치 이벤트 최적화
    function optimizeMapTouchEvents() {
        // 모든 .ol-viewport 요소에 touch-action 스타일 적용
        const viewports = document.querySelectorAll('.ol-viewport');
        viewports.forEach(viewport => {
            viewport.style.touchAction = 'pan-x pan-y';
            viewport.style.msTouchAction = 'pan-x pan-y';
        });
        
        // 기존 터치 이벤트 리스너를 passive로 변경
        const mapElements = document.querySelectorAll('[id$="_map"]');
        mapElements.forEach(mapElement => {
            // 터치 이벤트 최적화
            const touchEvents = ['touchstart', 'touchmove', 'touchend'];
            touchEvents.forEach(eventType => {
                const existingListeners = mapElement.getEventListeners?.(eventType) || [];
                existingListeners.forEach(listenerInfo => {
                    if (!listenerInfo.passive) {
                        mapElement.removeEventListener(eventType, listenerInfo.listener);
                        mapElement.addEventListener(eventType, listenerInfo.listener, { 
                            passive: true, 
                            capture: listenerInfo.capture 
                        });
                    }
                });
            });
        });
    }
    
    // 지도 로드 후 최적화 실행
    setTimeout(optimizeMapTouchEvents, 1000);
    
    // MutationObserver로 동적으로 생성되는 지도 요소 감지
    if (document.body) {
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                mutation.addedNodes.forEach(function(node) {
                    if (node.nodeType === 1) { // Element 노드
                        if (node.classList && (node.classList.contains('ol-viewport') || 
                            node.querySelector('.ol-viewport'))) {
                            setTimeout(optimizeMapTouchEvents, 100);
                        }
                    }
                });
            });
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    console.log('Korean GIS Map 터치 이벤트 최적화가 활성화되었습니다.');
    
})(); 