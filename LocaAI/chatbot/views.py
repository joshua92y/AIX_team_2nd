# LocaAI/chatbot/views.py

from rest_framework.response import Response
from rest_framework import status
from rest_framework.views import APIView
from chatbot.models import ChatSession, ChatLog, ChatMemory
from rest_framework.decorators import api_view
from django.shortcuts import render
from django.contrib.auth.decorators import login_required
from django.utils.crypto import get_random_string


@login_required
def chatbot_view(request):
    user = request.user

    # 사용자의 가장 최근 세션 가져오기 또는 새 세션 생성
    try:
        # 가장 최근 세션 가져오기
        session = ChatSession.objects.filter(user=user).order_by('-lastload_at', '-created_at').first()
        if not session:
            # 세션이 없으면 새로 생성
            session = ChatSession.objects.create(
                user=user,
                session_id=get_random_string(12)
            )
    except Exception as e:
        # 혹시 문제가 있으면 새 세션 생성
        session = ChatSession.objects.create(
            user=user,
            session_id=get_random_string(12)
        )

    user_info = {
        "user_id": str(user.id),  # UUID를 문자열로 변환
        "initial_session_id": session.session_id,
        "username": user.username,
    }

    return render(request, "chatbot/chat.html", {
        "user_info": user_info
    })

# 새 채팅 세션 생성 API
@api_view(['POST'])
def create_session(request, user_id):
    try:
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        user = User.objects.get(id=user_id)
        session = ChatSession.objects.create(user=user)
        
        return Response({
            "status": "ok",
            "session_id": session.session_id,
            "title": session.title,
            "created_at": session.created_at.isoformat()
        })
    except User.DoesNotExist:
        return Response({
            "status": "error",
            "message": "사용자를 찾을 수 없습니다."
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            "status": "error", 
            "message": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# 세션 제목 업데이트 API
@api_view(['PATCH'])
def update_session_title(request, user_id, session_id):
    try:
        data = request.data
        new_title = data.get('title', '').strip()
        
        if not new_title:
            return Response({
                "status": "error",
                "message": "제목을 입력해주세요."
            }, status=status.HTTP_400_BAD_REQUEST)
        
        session = ChatSession.objects.get(user_id=user_id, session_id=session_id)
        session.title = new_title
        session.save()
        
        return Response({
            "status": "ok",
            "session_id": session.session_id,
            "title": session.title
        })
        
    except ChatSession.DoesNotExist:
        return Response({
            "status": "error",
            "message": "세션을 찾을 수 없습니다"
        }, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({
            "status": "error",
            "message": str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

@api_view(['DELETE'])
def delete_session(request, user_id, session_id):
    try:
        session = ChatSession.objects.get(user_id=user_id, session_id=session_id)
        session.delete()
        return Response({"status": "ok"})
    except ChatSession.DoesNotExist:
        return Response({"status": "error", "message": "세션을 찾을 수 없습니다"}, status=status.HTTP_404_NOT_FOUND)

class ChatLogView(APIView):
    def get(self, request, user_id, session_id):
        try:
            session = ChatSession.objects.select_related("log").get(
                user__id=user_id, session_id=session_id
            )

            try:
                chatlog = session.log
                return Response({
                    "status": "ok",
                    "session_id": session.session_id,
                    "title": session.title,
                    "log": chatlog.log,
                    "created_at": session.created_at,
                })
            except ChatLog.DoesNotExist:
                return Response({
                    "status": "ok",
                    "log": [],
                    "message": "아직 대화 로그가 없습니다."
                })

        except ChatSession.DoesNotExist:
            return Response({
                "status": "error",
                "message": "세션을 찾을 수 없습니다."
            }, status=status.HTTP_404_NOT_FOUND)
        
class SessionListView(APIView):
    def get(self, request, user_id):
        try:
            # DB 쿼리
            sessions = ChatSession.objects.filter(user__id=user_id).order_by("-lastload_at", "-created_at")

            # 각 세션에 대해 최신 메시지와 요약 가져오기
            result = []
            for session in sessions:
                # 최근 메시지 가져오기
                try:
                    chat_log = session.log
                    latest_message = chat_log.log[-1] if chat_log.log else None
                    preview = latest_message['content'][:50] + '...' if latest_message else "새로운 대화를 시작해보세요..."
                except:
                    preview = "새로운 대화를 시작해보세요..."

                # 요약 정보
                summary = ChatMemory.objects.filter(
                    session=session, memory_type="summary"
                ).order_by("-created_at").first()

                result.append({
                    "session_id": session.session_id,
                    "title": session.title or "새 채팅",
                    "preview": preview,
                    "created_at": session.created_at.isoformat(),
                    "lastload_at": session.lastload_at.isoformat(),
                    "latest_summary": summary.content["text"] if summary else None
                })

            return Response({
                "status": "ok",
                "count": len(result),
                "sessions": result
            })

        except Exception as e:
            return Response({
                "status": "error",
                "message": str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)