# AIX_team_2nd

AI First Leader

1. 환경셋팅
   docker push joshua92y/aix2nd #도커 이미지 push
   docker pull joshua92y/aix2nd #도커 이미지 pull
   docker run -it --rm -p 8000:8000 locaai
   docker run -it --rm -v "${PWD}:/app" aix2nd bash #도커 마운트
   pip freeze > requirements.txt #pip 저장
   pip install -r requirements.txt #pip 설치
   git merge #머지는 신중히

2.django
uvicorn config.asgi:application --host 0.0.0.0 --port 8000


3. 빌드 셋팅
aws configure #aws config 셋팅
AWS Access Key ID [****************Q3ZW]:
AWS Secret Access Key [****************RseQ]:
Default region name [ap-northeast-3]: ap-northeast-3
Default output format [json]: json
docker build -t aix25best/701-14 . #빌드

$TOKEN = aws ecr-public get-login-password --region us-east-1 # ssh 토큰화
docker login --username AWS --password $TOKEN public.ecr.aws #aws 퍼블릭 ECR 에 로그인

docker images # 로컬 이미지 확인
docker tag aix25best/701-14:latest public.ecr.aws/s5p9b7c9/aix25best/701-14:latest #태그 매칭
docker push public.ecr.aws/s5p9b7c9/aix25best/701-14:latest #푸시
docker pull public.ecr.aws/s5p9b7c9/aix25best/701-14:latest #풀
sudo docker run -d -p 80:8000 --name myapp myimage #80포트:8000포트 포트포워딩
docker rmi public.ecr.aws/s5p9b7c9/aix25best/701-14:latest # 이미지 삭제 명령어

- config.json #도커 셋팅 
{
  "auths": {
    "public.ecr.aws": {}
  },
  "currentContext": "desktop-linux"
}

4. aws 인스턴스 셋팅
$ curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
sudo apt update && sudo apt install -y unzip
unzip awscliv2.zip
sudo ./aws/install
aws ecr-public get-login-password --region us-east-1 | docker login --username AWS --password-stdin public.ecr.aws # 도커 로그인

5. aws 명령어
ssh 접속
ssh -i .\aix-701-14-web-secure ubuntu@ec2-56-155-21-149.ap-northeast-3.compute.amazonaws.com

df -h # 남은용량 확인
docker rmi -f $(docker images -q) 도커 이미지 전체 삭제

