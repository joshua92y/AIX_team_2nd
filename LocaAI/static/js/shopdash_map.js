/**
 * shopdash_map.js
 * OpenLayers v10.6.1을 사용한 서울시 상권 분석 지도 - Vector Tile Selection 방식
 */

class SeoulCommercialMap {
    constructor(containerId) {
        this.containerId = containerId;
        this.map = null;
        this.districtLayer = null;
        this.dongLayer = null;
        this.selectionLayer = null;
        this.popup = null;
        this.selection = {}; // 선택된 feature들 관리
        this.currentView = 'district'; // 'district' 또는 'dong'
        this.currentGuCode = null; // 현재 표시 중인 구 코드
        
        this.setupProjections();
        this.init();
    }
    
    setupProjections() {
        // EPSG:5186 (Korea 2000 / Central Belt 2010) 좌표계 정의 - 정확한 파라미터
        if (typeof proj4 !== 'undefined') {
            proj4.defs('EPSG:5186', '+proj=tmerc +lat_0=38 +lon_0=127 +k=1 +x_0=200000 +y_0=600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs');
            ol.proj.proj4.register(proj4);
            
            // EPSG:5186 투영 객체 가져오기 및 범위 설정
            const proj5186 = ol.proj.get('EPSG:5186');
            if (proj5186) {
                // 서울시 실제 범위 설정 (EPSG:5186 좌표계)
                proj5186.setExtent([180000, 440000, 220000, 480000]);
            }
            
            console.log('EPSG:5186 좌표계 설정 완료');
        } else {
            console.warn('proj4 라이브러리가 로드되지 않았습니다. 좌표계 변환이 제한될 수 있습니다.');
        }
    }
    
    init() {
        this.createMap();
        this.createPopup();
        this.loadDistrictLayer();
        this.setupSelection();
    }
    
    createMap() {
        // 서울시 중심 좌표
        const seoulCenter = ol.proj.fromLonLat([126.9780, 37.5665]);
        
        // 지도 생성
        this.map = new ol.Map({
            target: this.containerId,
            layers: [
                new ol.layer.Tile({
                    source: new ol.source.OSM()
                })
            ],
            view: new ol.View({
                center: seoulCenter,
                zoom: 10,
                minZoom: 9,
                maxZoom: 18
            }),
            controls: [
                new ol.control.Zoom(),
                new ol.control.Attribution(),
                new ol.control.ScaleLine({
                    units: 'metric'
                })
            ],
            // Canvas 성능 최적화
            pixelRatio: 1,
            renderer: ['canvas', 'webgl']
        });
    }
    
    createPopup() {
        // 팝업 요소 생성
        const popupElement = document.createElement('div');
        popupElement.className = 'ol-popup';
        popupElement.innerHTML = `
            <div class="ol-popup-content">
                <div class="ol-popup-header">
                    <span class="ol-popup-title"></span>
                    <button class="ol-popup-closer">&times;</button>
                </div>
                <div class="ol-popup-body"></div>
            </div>
        `;
        
        // 팝업 오버레이 생성
        this.popup = new ol.Overlay({
            element: popupElement,
            autoPan: false,  // 지도 이동 비활성화
            positioning: 'bottom-center',
            stopEvent: false
        });
        
        this.map.addOverlay(this.popup);
        
        // 팝업 닫기 버튼 이벤트
        popupElement.querySelector('.ol-popup-closer').onclick = () => {
            this.popup.setPosition(undefined);
            return false;
        };
        
        // 팝업 스타일 추가
        this.addPopupStyles();
    }
    
    addPopupStyles() {
        if (document.getElementById('shopdash-map-styles')) return;
        
        const style = document.createElement('style');
        style.id = 'shopdash-map-styles';
        style.textContent = `
            .ol-popup {
                position: absolute;
                background-color: white;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                padding: 0;
                border-radius: 8px;
                border: 1px solid #ddd;
                min-width: 280px;
                max-width: 400px;
                z-index: 1000;
            }
            
            /* 기본 위치 (bottom-center) */
            .ol-popup {
                bottom: 12px;
                left: -140px; /* 팝업 너비의 절반 정도 */
            }
            .ol-popup:after, .ol-popup:before {
                top: 100%;
                left: 50%;
                border: solid transparent;
                content: " ";
                height: 0;
                width: 0;
                position: absolute;
                pointer-events: none;
            }
            .ol-popup:after {
                border-color: rgba(255, 255, 255, 0);
                border-top-color: white;
                border-width: 10px;
                margin-left: -10px;
            }
            .ol-popup:before {
                border-color: rgba(221, 221, 221, 0);
                border-top-color: #ddd;
                border-width: 11px;
                margin-left: -11px;
            }
            
            /* top-center 위치 (마우스 아래쪽 표시) */
            .ol-popup[data-position="top"] {
                top: 12px !important;
                bottom: auto !important;
            }
            .ol-popup[data-position="top"]:after,
            .ol-popup[data-position="top"]:before {
                top: auto !important;
                bottom: 100% !important;
            }
            .ol-popup[data-position="top"]:after {
                border-top-color: transparent !important;
                border-bottom-color: white !important;
            }
            .ol-popup[data-position="top"]:before {
                border-top-color: transparent !important;
                border-bottom-color: #ddd !important;
            }
            .ol-popup-content {
                padding: 0;
            }
            .ol-popup-header {
                background: linear-gradient(135deg, #4154f1 0%, #059652 100%);
                color: white;
                padding: 12px 15px;
                border-radius: 8px 8px 0 0;
                position: relative;
                font-weight: 600;
            }
            .ol-popup-title {
                font-size: 16px;
                margin: 0;
            }
            .ol-popup-closer {
                position: absolute;
                top: 8px;
                right: 10px;
                background: transparent;
                border: none;
                color: white;
                font-size: 20px;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
                transition: background-color 0.2s;
            }
            .ol-popup-closer:hover {
                background-color: rgba(255,255,255,0.2);
            }
            .ol-popup-body {
                padding: 15px;
                max-height: 300px;
                overflow-y: auto;
            }
            .popup-info-item {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid #eee;
            }
            .popup-info-item:last-child {
                border-bottom: none;
            }
            .popup-label {
                font-weight: 600;
                color: #333;
            }
            .popup-value {
                color: #666;
                text-align: right;
            }
            
            .popup-hint {
                font-size: 11px;
                color: #666;
                font-style: italic;
                text-align: center;
                padding: 8px 0;
                border-top: 1px solid #eee;
                margin-top: 5px;
            }
            .loading-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(255, 255, 255, 0.8);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                font-size: 16px;
                color: #666;
            }
        `;
        document.head.appendChild(style);
    }
    
    async loadDistrictLayer() {
        this.showLoading();
        
        try {
            console.log('구별 데이터 로딩 시작...');
            const response = await fetch('/shopdash/api/seoul-districts/');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const geojsonData = await response.json();
            console.log('구별 데이터 로드 성공:', geojsonData.features?.length, '개 구');
            
            // 기본 스타일
            const districtStyle = new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: '#4154f1',
                    width: 2
                }),
                fill: new ol.style.Fill({
                    color: 'rgba(65, 84, 241, 0.1)'
                })
            });
            
            // 선택된 스타일
            const selectedStyle = new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: '#ff4444',
                    width: 3
                }),
                fill: new ol.style.Fill({
                    color: 'rgba(255, 68, 68, 0.3)'
                })
            });
            
            // Vector Source 생성 (EPSG:5186에서 EPSG:3857로 변환)
            const vectorSource = new ol.source.Vector({
                features: new ol.format.GeoJSON().readFeatures(geojsonData, {
                    dataProjection: 'EPSG:5186',
                    featureProjection: 'EPSG:3857'
                })
            });
            
            // 변환된 features 디버깅
            const features = vectorSource.getFeatures();
            console.log('변환된 features 개수:', features.length);
            if (features.length > 0) {
                const firstFeature = features[0];
                const extent = firstFeature.getGeometry().getExtent();
                console.log('첫 번째 feature extent (EPSG:3857):', extent);
                console.log('첫 번째 feature 속성:', firstFeature.getProperties());
            }
            
            // 메인 레이어 생성
            this.districtLayer = new ol.layer.Vector({
                source: vectorSource,
                style: districtStyle
            });
            
            // 선택 레이어 생성 (Vector Tile Selection 패턴)
            this.selectionLayer = new ol.layer.Vector({
                source: vectorSource,
                style: (feature) => {
                    const featureId = feature.get('adm_sect_c');
                    if (featureId && featureId in this.selection) {
                        return selectedStyle;
                    }
                    return null; // 선택되지 않은 feature는 스타일 없음
                }
            });
            
            // 레이어를 지도에 추가
            this.map.addLayer(this.districtLayer);
            this.map.addLayer(this.selectionLayer);
            
            // 서울시 전체 범위로 뷰 조정
            const extent = vectorSource.getExtent();
            this.map.getView().fit(extent, {
                padding: [50, 50, 50, 50],
                maxZoom: 12
            });
            
            console.log('구별 레이어 추가 완료');
            
        } catch (error) {
            console.error('구별 데이터 로드 실패:', error);
            this.showError('구별 데이터를 불러오는데 실패했습니다: ' + error.message);
        } finally {
            this.hideLoading();
        }
    }
    
    setupSelection() {
        // 클릭 이벤트로 확대 및 행정동 표시
        this.map.on('click', (event) => {
            if (this.currentView === 'district') {
                // 구별 뷰에서 클릭 시
                const features = [];
                this.map.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
                    if (layer === this.districtLayer) {
                        features.push(feature);
                    }
                });
                
                if (features.length > 0) {
                    const feature = features[0];
                    const guCode = feature.get('adm_sect_c');
                    
                    // 해당 구로 확대 및 행정동 표시
                    this.zoomToDistrict(feature, guCode);
                    console.log('구 확대:', feature.get('district_name'));
                }
            } else if (this.currentView === 'dong') {
                // 행정동 뷰에서 클릭 시 - 구별 뷰로 복귀
                this.returnToDistrictView();
            }
        });
        
        // 마우스 오버 시 팝업 표시 및 커서 변경 (throttled)
        let lastMoveTime = 0;
        this.map.on('pointermove', (event) => {
            const now = Date.now();
            if (now - lastMoveTime < 50) return; // 50ms throttle
            lastMoveTime = now;
            
            if (this.currentView === 'district') {
                // 구별 뷰에서 마우스오버
                this.handleDistrictHover(event);
            } else if (this.currentView === 'dong') {
                // 행정동 뷰에서 마우스오버
                this.handleDongHover(event);
            }
        });
        
        // 마우스가 지도 밖으로 나갈 때 팝업 숨기기
        this.map.on('pointermove', (event) => {
            const pixel = this.map.getEventPixel(event.originalEvent);
            const feature = this.map.forEachFeatureAtPixel(pixel, (feature) => feature);
            
            if (!feature) {
                this.popup.setPosition(undefined);
            }
        });
    }
    
    handleDistrictHover(event) {
        const features = [];
        this.map.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
            if (layer === this.districtLayer) {
                features.push(feature);
            }
        }, {
            hitTolerance: 2
        });
        
        if (features.length > 0) {
            const feature = features[0];
            this.setCursor('pointer');
            this.showPopup(event.coordinate, feature.getProperties());
            
            // 선택 레이어 업데이트 (hover 효과)
            const featureId = feature.get('adm_sect_c');
            this.selection = {};
            this.selection[featureId] = feature;
            this.selectionLayer.getSource().changed();
        } else {
            this.setCursor('');
            this.popup.setPosition(undefined);
            this.selection = {};
            this.selectionLayer.getSource().changed();
        }
    }
    
    handleDongHover(event) {
        const features = [];
        this.map.forEachFeatureAtPixel(event.pixel, (feature, layer) => {
            if (layer === this.dongLayer) {
                features.push(feature);
            }
        }, {
            hitTolerance: 2
        });
        
        if (features.length > 0) {
            const feature = features[0];
            this.setCursor('pointer');
            this.showDongPopup(event.coordinate, feature.getProperties());
        } else {
            this.setCursor('');
            this.popup.setPosition(undefined);
        }
    }
    
    setCursor(cursorStyle) {
        try {
            const target = this.map.getTarget();
            if (target && typeof target === 'string') {
                const element = document.getElementById(target);
                if (element) {
                    element.style.cursor = cursorStyle;
                }
            } else if (target && target.style) {
                target.style.cursor = cursorStyle;
            }
        } catch (error) {
            console.warn('커서 스타일 설정 실패:', error);
        }
    }
    
    showPopup(coordinate, properties) {
        const popupElement = this.popup.getElement();
        const titleElement = popupElement.querySelector('.ol-popup-title');
        const bodyElement = popupElement.querySelector('.ol-popup-body');
        
        // 제목 설정
        titleElement.textContent = properties.full_name || properties.district_name;
        
        // 내용 설정
        bodyElement.innerHTML = `
            <div class="popup-info-item">
                <span class="popup-label">구 이름</span>
                <span class="popup-value">${properties.district_name}</span>
            </div>
            <div class="popup-info-item">
                <span class="popup-label">행정동 수</span>
                <span class="popup-value">${properties.dong_count}개</span>
            </div>
            <div class="popup-info-item">
                <span class="popup-label">총 인구</span>
                <span class="popup-value">${properties.total_population?.toLocaleString()}명</span>
            </div>
            <div class="popup-info-item">
                <span class="popup-label">업체 수</span>
                <span class="popup-value">${properties.total_businesses?.toLocaleString()}개</span>
            </div>
            <div class="popup-info-item">
                <span class="popup-label">면적</span>
                <span class="popup-value">${properties.area_sqkm?.toFixed(2)}km²</span>
            </div>
            <div class="popup-info-item">
                <span class="popup-hint">💡 클릭하면 해당 구의 행정동을 볼 수 있습니다</span>
            </div>
        `;
        
        // 스마트 팝업 위치 설정
        this.setSmartPopupPosition(coordinate);
    }
    
    showDongPopup(coordinate, properties) {
        const popupElement = this.popup.getElement();
        const titleElement = popupElement.querySelector('.ol-popup-title');
        const bodyElement = popupElement.querySelector('.ol-popup-body');
        
        // 제목 설정
        titleElement.textContent = properties.emd_kor_nm || '행정동';
        
        // 내용 설정
        bodyElement.innerHTML = `
            <div class="popup-info-item">
                <span class="popup-label">행정동</span>
                <span class="popup-value">${properties.emd_kor_nm}</span>
            </div>
            <div class="popup-info-item">
                <span class="popup-label">거주인구</span>
                <span class="popup-value">${properties.dong_life?.toLocaleString() || 0}명</span>
            </div>
            <div class="popup-info-item">
                <span class="popup-label">직장인구</span>
                <span class="popup-value">${properties.dong_work?.toLocaleString() || 0}명</span>
            </div>
            <div class="popup-info-item">
                <span class="popup-label">업체 수</span>
                <span class="popup-value">${properties.total_businesses?.toLocaleString() || 0}개</span>
            </div>
            <div class="popup-info-item">
                <span class="popup-label">평균 생존률</span>
                <span class="popup-value">${properties.avg_survival_rate || 0}%</span>
            </div>
            <div class="popup-info-item">
                <span class="popup-label">주요 업종</span>
                <span class="popup-value">${properties.top_business_type || '정보없음'} (${properties.top_business_count?.toLocaleString() || 0}개)</span>
            </div>
            <div class="popup-info-item">
                <span class="popup-hint">💡 클릭하면 구별 뷰로 돌아갑니다</span>
            </div>
        `;
        
        // 스마트 팝업 위치 설정
        this.setSmartPopupPosition(coordinate);
    }
    
    setSmartPopupPosition(coordinate) {
        // 화면 픽셀 좌표로 변환
        const pixel = this.map.getPixelFromCoordinate(coordinate);
        const mapSize = this.map.getSize();
        
        const popupElement = this.popup.getElement();
        
        // 상단에 가까우면 (상위 30% 영역) 팝업을 아래쪽에 표시
        if (pixel[1] < mapSize[1] * 0.3) {
            this.popup.setPositioning('top-center');
            popupElement.setAttribute('data-position', 'top');
            console.log('팝업을 마우스 아래쪽에 표시');
        } else {
            this.popup.setPositioning('bottom-center');
            popupElement.setAttribute('data-position', 'bottom');
            console.log('팝업을 마우스 위쪽에 표시');
        }
        
        this.popup.setPosition(coordinate);
    }
    
    async zoomToDistrict(districtFeature, guCode) {
        try {
            this.showLoading();
            
            // 구별 레이어 숨기기
            this.districtLayer.setVisible(false);
            this.selectionLayer.setVisible(false);
            
            // 행정동 데이터 로드
            await this.loadDongLayer(guCode);
            
            // 해당 구의 extent로 확대
            const geometry = districtFeature.getGeometry();
            const extent = geometry.getExtent();
            
            this.map.getView().fit(extent, {
                padding: [50, 50, 50, 50],
                duration: 1000,
                maxZoom: 15
            });
            
            // 뷰 모드 변경
            this.currentView = 'dong';
            this.currentGuCode = guCode;
            
            console.log('행정동 뷰로 전환:', guCode);
            
        } catch (error) {
            console.error('구 확대 실패:', error);
            this.showError('행정동 데이터를 불러오는데 실패했습니다.');
        } finally {
            this.hideLoading();
        }
    }
    
    async loadDongLayer(guCode) {
        try {
            // 기존 행정동 레이어 제거
            if (this.dongLayer) {
                this.map.removeLayer(this.dongLayer);
            }
            
            // 행정동 데이터 API 호출
            const response = await fetch(`/shopdash/api/dong-geojson/?gu_code=${guCode}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const geojsonData = response.json ? await response.json() : response;
            console.log('행정동 데이터 로드:', geojsonData.features?.length, '개');
            
            // Vector Source 생성 (EPSG:5186에서 EPSG:3857로 변환)
            const vectorSource = new ol.source.Vector({
                features: new ol.format.GeoJSON().readFeatures(geojsonData, {
                    dataProjection: 'EPSG:5186',
                    featureProjection: 'EPSG:3857'
                })
            });
            
            // 행정동 레이어 생성
            this.dongLayer = new ol.layer.Vector({
                source: vectorSource,
                style: new ol.style.Style({
                    stroke: new ol.style.Stroke({
                        color: '#2196F3',
                        width: 2
                    }),
                    fill: new ol.style.Fill({
                        color: 'rgba(33, 150, 243, 0.1)'
                    })
                }),
                zIndex: 10
            });
            
            // 지도에 추가
            this.map.addLayer(this.dongLayer);
            
        } catch (error) {
            console.error('행정동 레이어 로드 실패:', error);
            throw error;
        }
    }
    
    returnToDistrictView() {
        // 행정동 레이어 제거
        if (this.dongLayer) {
            this.map.removeLayer(this.dongLayer);
            this.dongLayer = null;
        }
        
        // 구별 레이어 다시 표시
        this.districtLayer.setVisible(true);
        this.selectionLayer.setVisible(true);
        
        // 서울시 전체 뷰로 복귀
        if (this.districtLayer) {
            const extent = this.districtLayer.getSource().getExtent();
            this.map.getView().fit(extent, {
                padding: [50, 50, 50, 50],
                duration: 1000,
                maxZoom: 12
            });
        }
        
        // 뷰 모드 변경
        this.currentView = 'district';
        this.currentGuCode = null;
        
        // 팝업 숨기기
        this.popup.setPosition(undefined);
        
        console.log('구별 뷰로 복귀');
    }
    
    showLoading() {
        const mapElement = document.getElementById(this.containerId);
        if (!mapElement.querySelector('.loading-overlay')) {
            const loadingDiv = document.createElement('div');
            loadingDiv.className = 'loading-overlay';
            loadingDiv.innerHTML = '<div>데이터 로딩 중...</div>';
            mapElement.appendChild(loadingDiv);
        }
    }
    
    hideLoading() {
        const mapElement = document.getElementById(this.containerId);
        const loadingDiv = mapElement.querySelector('.loading-overlay');
        if (loadingDiv) {
            loadingDiv.remove();
        }
    }
    
    showError(message) {
        console.error('지도 오류:', message);
        const mapElement = document.getElementById(this.containerId);
        
        // 기존 오류 메시지 제거
        const existingError = mapElement.querySelector('.error-overlay');
        if (existingError) {
            existingError.remove();
        }
        
        // 새 오류 메시지 표시
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-overlay';
        errorDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ff4444;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            z-index: 1001;
            max-width: 300px;
            text-align: center;
        `;
        errorDiv.textContent = message;
        
        mapElement.appendChild(errorDiv);
        
        // 5초 후 자동 제거
        setTimeout(() => {
            if (errorDiv.parentNode) {
                errorDiv.remove();
            }
        }, 5000);
    }
    
    reset() {
        this.selection = {};
        if (this.selectionLayer) {
            this.selectionLayer.getSource().changed();
        }
        this.popup.setPosition(undefined);
        
        // 서울시 전체 뷰로 복귀
        if (this.districtLayer) {
            const extent = this.districtLayer.getSource().getExtent();
            this.map.getView().fit(extent, {
                padding: [50, 50, 50, 50],
                maxZoom: 12
            });
        }
    }
}

// 전역 함수
function initializeMap() {
    // DOM이 완전히 로드된 후 지도 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.seoulMap = new SeoulCommercialMap('map');
        });
    } else {
        window.seoulMap = new SeoulCommercialMap('map');
    }
}

// 페이지 로드 시 자동 초기화
initializeMap();
