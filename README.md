# aah-sample-ui-for-studio — UI for Studio Agent / Team

AAH Code Deploy 시연용 **UI 단독 샘플** (#2 + #3 공유).

AAH Studio 에서 Power User 가 빌드한 결과물 (Agent 또는 Team) 의 컨테이너 ARN
을 받아서 호출하는 외부 채팅 UI. Studio Mode 결과물을 자체 서비스로 노출하는
패턴 — Power User 가 "Agent 빌더" 역할, 다른 사람이 "사용자 UI" 역할.

## 시나리오

| | repo URL | 박는 ARN |
|---|---|---|
| **#2** UI + Studio Agent | 이 repo | `/agents/{id}` 의 baked AgentCore Runtime ARN |
| **#3** UI + Studio Team  | 이 repo | `/teams/{id}` 의 baked AgentCore Runtime ARN |

UI 컨테이너 코드는 Agent / Team 구분 없이 동일 — 둘 다 `invoke_agent_runtime`
한 번 호출하면 끝.

## 배포 절차

1. AAH `/agents` 또는 `/teams` 에서 시연용 Agent/Team 빌드 + 컨테이너 배포 (READY 까지)
2. 그 ARN 복사 (예: `arn:aws:bedrock-agentcore:us-east-1:ACCT:runtime/aah_agent_XXX-YYYY`)
3. `/develop/code-deploy` → 새 배포
4. repo URL: `https://github.com/myzzix4/aah-sample-ui-for-studio`
5. aah.yaml 분석 → 1 service (ui), 0 resources
6. 환경변수:
   - `AGENT_RUNTIME_ARN` = 위에서 복사한 ARN (**필수**)
   - `UI_TITLE` = "보험 약관 상담" 같이 적절히
7. 배포 (약 3-4분, UI 컨테이너만)

## 동작

UI 컨테이너:
- `GET /` : 채팅 페이지 (Flask render_template)
- `POST /api/chat` : invoke_agent_runtime buffered JSON
- `POST /api/chat-sse` : invoke_agent_runtime SSE forward (token 단위)

ARN 에 대고 그냥 invoke 호출만 함 — Agent 인지 Team 인지 상관 X. 컨테이너 내부
에서 Studio baked 워크플로우 (multi-agent, parallel_fork, ReAct, etc) 가 진짜
실행됨.

## 디렉토리

```
services/ui/
  Dockerfile         # amd64 python:3.12-slim
  requirements.txt   # flask, gunicorn, boto3
  app.py             # Flask + SSE forward
  templates/index.html
  static/{app.css, app.js}
```
