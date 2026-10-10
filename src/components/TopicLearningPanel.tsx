'use client';

import { useState } from 'react';
import { RoadmapNode } from '@/types/roadmap';
import { LearningActivity, TopicLearningContent, TopicProgress } from '@/types/learning';

interface TopicLearningPanelProps {
  topic: RoadmapNode;
  careerTitle: string;
  relatedTopics: string[];
  progress: TopicProgress;
  storageError: string | null;
  content: TopicLearningContent | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRetry: () => void;
  onMarkTopicComplete: () => void;
  onToggleActivityComplete: (activityId: string) => void;
  onOpenActivity: () => void;
}

export default function TopicLearningPanel({
  topic,
  careerTitle,
  relatedTopics,
  progress,
  storageError,
  content,
  loading,
  error,
  onClose,
  onRetry,
  onMarkTopicComplete,
  onToggleActivityComplete,
  onOpenActivity,
}: TopicLearningPanelProps) {
  const [activeActivityId, setActiveActivityId] = useState<string | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const activeActivity = content?.activities.find((activity) => activity.id === activeActivityId);
  const topicStatus = progress.completed ? 'Completed' : progress.started ? 'In progress' : 'Not started';
  const allActivitiesComplete = Boolean(content?.activities.length) &&
    content!.activities.every((activity) => progress.completedActivityIds.includes(activity.id));

  const openActivity = (activity: LearningActivity) => {
    setActiveActivityId(activity.id);
    setSelectedAnswer(null);
    setShowAnswer(false);
    onOpenActivity();
  };

  return (
    <div className="fixed inset-0 z-[70] flex justify-end bg-slate-950/45" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        className="flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="topic-panel-title"
      >
        <header className="border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-4 sm:px-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-blue-700">{careerTitle}{topic.group ? ` · ${topic.group}` : ''}</p>
              <h2 id="topic-panel-title" className="mt-1 text-2xl font-bold text-slate-900">{topic.name}</h2>
              <p className="mt-2 text-sm text-slate-600">{topic.description}</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-full p-2 text-slate-500 hover:bg-white hover:text-slate-900" aria-label="Close topic details">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {storageError && <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{storageError}</p>}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${
              progress.completed ? 'bg-emerald-100 text-emerald-800' :
              progress.started ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
            }`}>{topicStatus}</span>
            <button
              type="button"
              onClick={onMarkTopicComplete}
              disabled={allActivitiesComplete && !progress.manuallyCompleted}
              className={`rounded-lg px-4 py-2 text-sm font-semibold transition disabled:cursor-default disabled:opacity-70 ${
                progress.manuallyCompleted ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50' :
                'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}
            >
              {progress.manuallyCompleted ? 'Undo topic completion' : allActivitiesComplete ? 'Completed from activities' : 'Mark topic complete'}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          {loading && (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-center text-slate-600" role="status">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              <p>Preparing a detailed lesson and activities…</p>
              <p className="text-xs text-slate-500">This may take a little while depending on the AI model.</p>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4" role="alert">
              <p className="text-sm text-red-800">{error}</p>
              <button type="button" onClick={onRetry} className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800">Try again</button>
            </div>
          )}

          {!loading && !error && !content && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              A topic lesson has not been loaded yet.
              <button type="button" onClick={onRetry} className="ml-2 font-semibold text-blue-700 hover:underline">Load lesson</button>
            </div>
          )}

          {!loading && content && !activeActivity && (
            <div className="space-y-7">
              <section>
                <h3 className="text-lg font-bold text-slate-900">Topic overview</h3>
                <p className="mt-2 leading-relaxed text-slate-700">{content.overview}</p>
                <p className="mt-3 leading-relaxed text-slate-600">{content.explanation}</p>
                <p className="mt-3 rounded-lg border-l-4 border-blue-500 bg-blue-50 p-3 text-sm text-blue-950"><strong>Why it matters:</strong> {content.whyItMatters}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">{content.difficulty}</span>
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-700">About {Math.round(content.estimatedMinutes / 60 * 10) / 10} learning hours</span>
                </div>
                <div className="mt-3">
                  <h4 className="text-sm font-semibold text-slate-800">Prerequisites</h4>
                  <p className="mt-1 text-sm text-slate-600">{content.prerequisites.length ? content.prerequisites.join(' · ') : 'No prior topics listed.'}</p>
                </div>
              </section>

              <section>
                <h3 className="text-lg font-bold text-slate-900">Learning objectives</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">
                  {content.learningObjectives.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-bold text-slate-900">Important concepts</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {content.concepts.map((item) => <span key={item} className="rounded-full bg-indigo-50 px-3 py-1 text-sm text-indigo-800">{item}</span>)}
                </div>
              </section>

              <section>
                <h3 className="text-lg font-bold text-slate-900">Step-by-step learning guide</h3>
                <ol className="mt-3 space-y-3">
                  {content.learningGuide.map((item, index) => (
                    <li key={`${index}-${item}`} className="flex gap-3 text-slate-700">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-bold text-blue-800">{index + 1}</span>
                      <span className="pt-1">{item}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <section>
                <h3 className="text-lg font-bold text-slate-900">Examples and practical applications</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">{content.examples.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
              </section>

              <section>
                <h3 className="text-lg font-bold text-slate-900">Common mistakes</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-700">{content.commonMistakes.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul>
              </section>

              {content.subtopics.length > 0 && (
                <section>
                  <h3 className="text-lg font-bold text-slate-900">Related subtopics</h3>
                  <p className="mt-2 text-slate-700">{content.subtopics.join(' · ')}</p>
                </section>
              )}

              {relatedTopics.length > 0 && (
                <section>
                  <h3 className="text-lg font-bold text-slate-900">Connected roadmap topics</h3>
                  <p className="mt-2 text-slate-700">{relatedTopics.join(' · ')}</p>
                </section>
              )}

              <section>
                <h3 className="text-lg font-bold text-slate-900">Learning resources</h3>
                <ul className="mt-3 space-y-3">
                  {content.resources.map((resource) => (
                    <li key={`${resource.title}-${resource.url}`} className="rounded-xl border border-slate-200 p-4">
                      <a href={resource.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 underline decoration-blue-300 underline-offset-2 hover:text-blue-900">{resource.title}</a>
                      <p className="mt-1 text-sm text-slate-600">{resource.description}</p>
                    </li>
                  ))}
                </ul>
              </section>

              <section>
                <h3 className="text-lg font-bold text-slate-900">Knowledge check</h3>
                <div className="mt-3 rounded-xl border border-slate-200 p-4">
                  <p className="font-medium text-slate-800">{content.quiz.question}</p>
                  <div className="mt-3 space-y-2">
                    {content.quiz.options.map((option, index) => (
                      <label key={`${index}-${option}`} className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-3 text-sm hover:bg-slate-50">
                        <input type="radio" name={`quiz-${topic.id}`} checked={selectedAnswer === index} onChange={() => { setSelectedAnswer(index); setShowAnswer(false); }} />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                  <button type="button" disabled={selectedAnswer === null} onClick={() => setShowAnswer(true)} className="mt-3 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50">Check answer</button>
                  {showAnswer && selectedAnswer !== null && (
                    <p className={`mt-3 text-sm ${selectedAnswer === content.quiz.answerIndex ? 'text-emerald-800' : 'text-amber-800'}`}>
                      {selectedAnswer === content.quiz.answerIndex ? 'Correct. ' : 'Not quite. '}
                      {content.quiz.explanation}
                    </p>
                  )}
                </div>
              </section>

              <section>
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-bold text-slate-900">Practice activities</h3>
                  <span className="text-xs text-slate-500">{progress.completedActivityIds.length}/{content.activities.length} completed</span>
                </div>
                <div className="mt-3 space-y-3">
                  {content.activities.map((activity) => {
                    const isComplete = progress.completedActivityIds.includes(activity.id);
                    return (
                      <article key={activity.id} className="rounded-xl border border-slate-200 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <span className="text-xs font-semibold uppercase tracking-wide text-blue-700">{activity.type}</span>
                            <h4 className="mt-1 font-semibold text-slate-900">{activity.title}</h4>
                            <p className="mt-1 text-sm text-slate-600">{activity.description}</p>
                            <p className="mt-2 text-xs text-slate-500">{activity.difficulty} · {activity.estimatedMinutes} min</p>
                          </div>
                          <button type="button" onClick={() => openActivity(activity)} className="rounded-lg border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">Open activity</button>
                        </div>
                        <button type="button" onClick={() => onToggleActivityComplete(activity.id)} className={`mt-3 text-sm font-semibold ${isComplete ? 'text-slate-600' : 'text-emerald-700'}`}>
                          {isComplete ? '✓ Completed · Undo' : 'Mark activity complete'}
                        </button>
                      </article>
                    );
                  })}
                </div>
              </section>
            </div>
          )}

          {!loading && content && activeActivity && (
            <div className="space-y-6">
              <button type="button" onClick={() => setActiveActivityId(null)} className="text-sm font-semibold text-blue-700 hover:underline">← Back to topic</button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{activeActivity.type}</p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900">{activeActivity.title}</h3>
                <p className="mt-2 text-slate-600">{activeActivity.description}</p>
                <p className="mt-3 text-sm text-slate-500">{activeActivity.difficulty} · about {activeActivity.estimatedMinutes} minutes</p>
              </div>
              <p className="rounded-lg bg-blue-50 p-4 text-sm text-blue-950"><strong>Learning objective:</strong> {activeActivity.objective}</p>
              <section>
                <h4 className="font-bold text-slate-900">Instructions</h4>
                <ol className="mt-2 list-decimal space-y-2 pl-5 text-slate-700">{activeActivity.steps.map((step, index) => <li key={`${index}-${step}`}>{step}</li>)}</ol>
              </section>
              <section>
                <h4 className="font-bold text-slate-900">Expected output</h4>
                <p className="mt-2 whitespace-pre-wrap rounded-lg bg-slate-50 p-4 text-sm text-slate-700">{activeActivity.expectedOutput}</p>
              </section>
              <details className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                <summary className="cursor-pointer font-semibold text-amber-900">Show hint</summary>
                <p className="mt-2 text-sm text-amber-900">{activeActivity.hint}</p>
              </details>
              <button type="button" onClick={() => onToggleActivityComplete(activeActivity.id)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                progress.completedActivityIds.includes(activeActivity.id) ? 'border border-slate-300 text-slate-700' : 'bg-emerald-600 text-white hover:bg-emerald-700'
              }`}>
                {progress.completedActivityIds.includes(activeActivity.id) ? 'Undo activity completion' : 'Mark activity complete'}
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
