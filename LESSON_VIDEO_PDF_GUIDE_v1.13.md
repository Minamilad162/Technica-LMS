# Technica LMS — Lesson content model (v1.13.0)

- In **Course Builder → Content → Add lesson/Edit lesson**, the only authorable content types are **Video** and **PDF**.
- Lesson fields: title, content type, description, optional locally attached video or PDF. **No editable duration field**.
- A PDF lesson has **no duration**. A video lesson derives its `durationSeconds` from the actual video file's HTML media metadata; we never invent a duration. If unsupported by the browser (common for some MOV codecs) the runtime stays unavailable.
- Importing an existing uploaded video from Course resources also attempts to read metadata when needed. For videos newly uploaded to Course resources, runtime is captured on import.
- No changes to **Practice/Assessment timer** settings. Those are exam durations, not lesson durations.
- Legacy saved browser lessons with Reading/Quiz remain readable; when edited, the lesson must be saved as either Video or PDF (legacy content is not lost until edit).
- Course media are **demo-local IndexedDB** files, not backed up or uploaded to Supabase.
