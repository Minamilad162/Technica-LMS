# Question Navigator — Final review warning (v1.9.2)

The same rules apply to **Practice** and **Assessment**.

1. Moving with **Next question**, **Previous** or numbered navigation does not add red/coral unanswered markers, even if the learner leaves an item blank. Answered items keep their standard highlight; flagged items keep their separate flag indicator.
2. When the learner explicitly chooses **Review and submit** (including Next on the last question), the review dialog checks all unanswered items. Only then do the unanswered numbers gain the **!** warning in the Question Navigator.
3. The dialog lists missing question numbers and allows directly revisiting them. Submission with blank answers remains an explicit final choice.
4. The number of unanswered questions is calculated from answers, including option A with index 0 as a valid answer.
5. A timer reaching zero continues to auto-submit according to the existing timer rules. It is not a learner-initiated review.

The previous v1.9.1 behavior (marking a question immediately after leaving it) has been replaced. Legacy session `visitedQuestions` is harmless and not used for warning rendering. The Assessment overview no longer contains the separate domain-content panel or attempt-count tile.
