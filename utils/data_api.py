# -*- coding: utf-8 -*-
import requests
import pandas as pd
from datetime import datetime, time, timedelta
import time as tz

API_KEY = "66465476596b616e3531586d5a6a41"
BASE_URL = "http://openapi.seoul.go.kr:8088/{key}/json/{service}/{start}/{end}"

# 연도 기준 필터용
YEARS = [y for y in range(2016, 2025) if y not in [2020, 2021]]

# 필요한 컬럼만 추출
COLUMNS = ["FACILTOTSCP", "UPTAENM", "X", "Y", "APVPERMYMD", "DCBYMD"]


def fetch_by_year(service_code, label, per_page=1000):
    all_data = []
    total_requests = 0
    last_log_time = t.time()

    for year in YEARS:
        print(f"📆 {service_code} - {year} 데이터 요청 중...")
        start_idx = 1
        while True:
            end_idx = start_idx + per_page - 1
            url = BASE_URL.format(
                key=API_KEY, service=service_code, start=start_idx, end=end_idx
            )
            res = requests.get(url).json()
            rows = res.get(service_code, {}).get("row", [])
            total_requests += 1

            if not rows:
                print(f"🔚 {year}년 데이터 종료 (총 {start_idx - 1}건 요청함)")
                break

            year_rows = 0
            for row in rows:
                apv_date = row.get("APVPERMYMD")
                if apv_date and str(apv_date).startswith(str(year)):
                    row["label"] = label  # 일반: 0, 휴게: 1
                    all_data.append({k: row.get(k, None) for k in COLUMNS + ["label"]})
                    year_rows += 1

            print(
                f"  ➕ {year}년 {start_idx}~{end_idx} 요청 성공, {year_rows}건 필터링"
            )

            if t.time() - last_log_time >= 10:
                print(
                    f"⏳ 현재까지 요청 수: {total_requests}회, 누적 데이터 수: {len(all_data)}건"
                )
                last_log_time = t.time()

            start_idx += per_page

    return pd.DataFrame(all_data)


def process(df):
    today = pd.Timestamp.today()
    df["APVPERMYMD"] = pd.to_datetime(df["APVPERMYMD"], errors="coerce")
    df["DCBYMD"] = pd.to_datetime(df["DCBYMD"], errors="coerce")
    df = df[df["APVPERMYMD"].notna()]

    df["days_alive"] = (df["DCBYMD"].fillna(today) - df["APVPERMYMD"]).dt.days
    df = df[(df["days_alive"] < 180) | (df["days_alive"] >= 1825)]

    # 타깃 컬럼: 6개월 미만 = 0, 5년 이상 = 1
    df["target"] = df["days_alive"].apply(lambda d: 0 if d < 180 else 1)
    return df[["FACILTOTSCP", "UPTAENM", "X", "Y", "target", "label"]]


# 일반음식점: 0
df_general = fetch_by_year("LOCALDATA_072404", label=0)

# 휴게음식점: 1
df_rest = fetch_by_year("LOCALDATA_072405", label=1)

# 통합 및 전처리
final_df = pd.concat([df_general, df_rest], ignore_index=True)
final_df = process(final_df)

# 저장
final_df.to_csv("서울_음식점_인허가_데이터.csv", index=False, encoding="utf-8-sig")
print("✅ CSV 저장 완료: 서울_음식점_인허가_데이터.csv")
