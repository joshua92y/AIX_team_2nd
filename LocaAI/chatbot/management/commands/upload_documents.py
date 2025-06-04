import json
import os
from django.core.management.base import BaseCommand
from chatbot.rag_pipeline import upload_documents, initialize_chains


class Command(BaseCommand):
    help = "Upload documents to Qdrant vector store"

    def add_arguments(self, parser):
        parser.add_argument(
            "file_path",
            type=str,
            help="Path to the JSON file containing documents",
        )

    def handle(self, *args, **options):
        file_path = options["file_path"]

        if not os.path.exists(file_path):
            self.stdout.write(self.style.ERROR(f"File not found: {file_path}"))
            return

        try:
            # 문서 로드
            with open(file_path, "r", encoding="utf-8") as f:
                documents = json.load(f)

            # 체인 초기화
            self.stdout.write("Initializing chains...")
            initialize_chains()

            # 문서 업로드
            self.stdout.write("Uploading documents...")
            success = upload_documents(documents)

            if success:
                self.stdout.write(
                    self.style.SUCCESS("Documents uploaded successfully!")
                )
            else:
                self.stdout.write(self.style.ERROR("Failed to upload documents"))

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error: {str(e)}"))
