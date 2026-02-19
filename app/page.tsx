'use client'

import { useState, useEffect, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  FiSearch, FiX, FiExternalLink, FiMail, FiCopy, FiMapPin,
  FiCalendar, FiUsers, FiCompass, FiSend,
  FiCheck, FiPlus, FiFilter, FiLinkedin, FiRefreshCw
} from 'react-icons/fi'
import { HiOutlineSparkles } from 'react-icons/hi2'

// ─── Types ───────────────────────────────────────────────────────────────────

interface EventData {
  event_title: string
  event_date: string
  event_time: string
  venue_name: string
  venue_address: string
  platform_source: string
  registration_url: string
  event_description: string
  estimated_attendee_count: string
  organizer_name: string
  organizer_role: string
  organizer_linkedin_url: string
  organizer_email: string
  partnership_url: string
  cfp_url: string
  organization_name: string
  persona_match_score: number
  score_rationale: string
  outreach_pitch: string
  email_subject_line: string
}

interface DiscoveryResponse {
  events: EventData[]
  total_events_found: number
  search_summary: string
  enrichment_summary: string
  overall_strategy_summary: string
}

type PipelineStatus = 'Saved' | 'Contacted' | 'Responded' | 'Partnered'

interface PipelineEvent extends EventData {
  pipeline_status: PipelineStatus
  tracked_at: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const AGENT_ID = '69961be5a552b02becc38dd5'
const PIPELINE_KEY = 'leadgen-pipeline'
const PIPELINE_COLUMNS: PipelineStatus[] = ['Saved', 'Contacted', 'Responded', 'Partnered']

// ─── Sample Data ─────────────────────────────────────────────────────────────

const SAMPLE_EVENTS: EventData[] = [
  {
    event_title: 'AI & Machine Learning Summit 2025',
    event_date: '2025-04-15',
    event_time: '09:00 - 17:00',
    venue_name: 'Grand Hyatt San Francisco',
    venue_address: '345 Stockton St, San Francisco, CA 94108',
    platform_source: 'Eventbrite',
    registration_url: 'https://eventbrite.com/ai-ml-summit-2025',
    event_description: 'A premier gathering of AI leaders, researchers, and practitioners exploring the latest breakthroughs in machine learning, generative AI, and enterprise adoption strategies.',
    estimated_attendee_count: '2,500',
    organizer_name: 'Dr. Sarah Chen',
    organizer_role: 'VP of Technology Partnerships',
    organizer_linkedin_url: 'https://linkedin.com/in/sarahchen',
    organizer_email: 'sarah.chen@aisummit.io',
    partnership_url: 'https://aisummit.io/partners',
    cfp_url: 'https://aisummit.io/cfp',
    organization_name: 'TechForward Institute',
    persona_match_score: 92,
    score_rationale: 'High alignment with AI/ML persona. Enterprise audience with strong decision-maker presence. Previous sponsors saw 3x ROI on partnership investment.',
    outreach_pitch: 'Hi Dr. Chen, I came across the AI & ML Summit and was impressed by the caliber of speakers and attendees. We believe our platform could add significant value as a sponsor partner, offering live demos and workshops to your enterprise audience.',
    email_subject_line: 'Partnership Opportunity - AI & ML Summit 2025'
  },
  {
    event_title: 'DevOps World Conference',
    event_date: '2025-05-22',
    event_time: '08:30 - 18:00',
    venue_name: 'Moscone Center',
    venue_address: '747 Howard St, San Francisco, CA 94103',
    platform_source: 'LinkedIn Events',
    registration_url: 'https://devopsworld.com/register',
    event_description: 'The largest DevOps conference bringing together engineers, platform teams, and CTOs to discuss CI/CD, infrastructure-as-code, and cloud-native development.',
    estimated_attendee_count: '5,000',
    organizer_name: 'Marcus Rivera',
    organizer_role: 'Head of Developer Relations',
    organizer_linkedin_url: 'https://linkedin.com/in/marcusrivera',
    organizer_email: 'marcus@devopsworld.com',
    partnership_url: 'https://devopsworld.com/sponsor',
    cfp_url: 'https://devopsworld.com/speak',
    organization_name: 'CloudNative Foundation',
    persona_match_score: 78,
    score_rationale: 'Strong developer audience match. Good overlap with platform engineering persona. Large attendee count provides broad exposure.',
    outreach_pitch: 'Marcus, DevOps World is exactly the kind of event where our developer tools resonate. We would love to explore a workshop slot or demo booth to showcase our latest CI/CD integrations.',
    email_subject_line: 'Speaker & Sponsor Inquiry - DevOps World'
  },
  {
    event_title: 'Women in Tech Leadership Forum',
    event_date: '2025-03-28',
    event_time: '10:00 - 16:00',
    venue_name: 'The Ritz-Carlton',
    venue_address: '600 Stockton St, San Francisco, CA 94108',
    platform_source: 'Luma',
    registration_url: 'https://lu.ma/womenintechsf',
    event_description: 'An exclusive forum for women leaders in technology, featuring fireside chats, mentorship sessions, and networking with C-suite executives.',
    estimated_attendee_count: '300',
    organizer_name: 'Priya Patel',
    organizer_role: 'Executive Director',
    organizer_linkedin_url: 'https://linkedin.com/in/priyapatel',
    organizer_email: 'priya@witlforum.org',
    partnership_url: 'https://witlforum.org/partners',
    cfp_url: '',
    organization_name: 'Women in Tech Leadership',
    persona_match_score: 65,
    score_rationale: 'Moderate alignment with core persona. Excellent networking quality with C-suite. Smaller event but high-value contacts.',
    outreach_pitch: 'Priya, we admire the work Women in Tech Leadership is doing. We would be honored to support this forum as a partner, offering scholarships and mentorship resources to attendees.',
    email_subject_line: 'Supporting Women in Tech - Partnership Proposal'
  },
  {
    event_title: 'Startup Pitch Night - Bay Area Edition',
    event_date: '2025-04-02',
    event_time: '18:00 - 21:00',
    venue_name: 'WeWork SOMA',
    venue_address: '44 Tehama St, San Francisco, CA 94105',
    platform_source: 'Meetup',
    registration_url: 'https://meetup.com/startup-pitch-night-sf',
    event_description: 'Monthly pitch night for early-stage startups. 10 startups pitch to a panel of VCs and angels. Networking mixer follows.',
    estimated_attendee_count: '150',
    organizer_name: 'Jason Park',
    organizer_role: 'Community Lead',
    organizer_linkedin_url: 'https://linkedin.com/in/jasonpark',
    organizer_email: 'jason@startuppitch.co',
    partnership_url: '',
    cfp_url: 'https://startuppitch.co/apply',
    organization_name: 'Startup Pitch Collective',
    persona_match_score: 35,
    score_rationale: 'Lower alignment with enterprise persona. Primarily early-stage audience. Better suited for developer tools than enterprise solutions.',
    outreach_pitch: 'Jason, we noticed the Startup Pitch Night has a growing community. We could offer our platform as a prize for the winning team or provide a brief demo during the networking session.',
    email_subject_line: 'Prize Sponsor Offer - Startup Pitch Night'
  }
]

const SAMPLE_SUMMARY: Partial<DiscoveryResponse> = {
  total_events_found: 4,
  search_summary: 'Found 4 relevant events in San Francisco area matching AI/Tech persona across Eventbrite, LinkedIn Events, Luma, and Meetup platforms.',
  enrichment_summary: 'All 4 events enriched with organizer contact details, partnership URLs, and CFP links where available.',
  overall_strategy_summary: 'Focus on the AI & ML Summit (92 score) and DevOps World (78 score) for maximum ROI. The Women in Tech Forum offers high-quality networking despite moderate score. Startup Pitch Night is lower priority but offers community visibility.'
}

const SAMPLE_PAST_EVENTS: EventData[] = [
  {
    event_title: 'SaaS Growth Summit 2024',
    event_date: '2024-11-12',
    event_time: '09:00 - 17:00',
    venue_name: 'Marriott Marquis',
    venue_address: '780 Mission St, San Francisco, CA 94103',
    platform_source: 'Eventbrite',
    registration_url: 'https://eventbrite.com/saas-growth-2024',
    event_description: 'Annual gathering of SaaS founders, investors, and operators discussing growth strategies, product-led growth, and market expansion.',
    estimated_attendee_count: '1,200',
    organizer_name: 'Amanda Lee',
    organizer_role: 'Head of Events',
    organizer_linkedin_url: 'https://linkedin.com/in/amandalee',
    organizer_email: 'amanda@saasgrowth.io',
    partnership_url: 'https://saasgrowth.io/partners',
    cfp_url: '',
    organization_name: 'SaaS Growth Collective',
    persona_match_score: 81,
    score_rationale: 'Strong SaaS audience alignment. High decision-maker density among attendees. Previous event had excellent sponsor engagement metrics.',
    outreach_pitch: 'Amanda, the SaaS Growth Summit was a fantastic event last year. We would love to discuss a partnership for next year, offering our analytics platform as a key sponsor resource.',
    email_subject_line: 'Partnership Follow-up - SaaS Growth Summit'
  },
  {
    event_title: 'Cloud Infrastructure Meetup',
    event_date: '2024-09-05',
    event_time: '18:30 - 21:00',
    venue_name: 'GitHub HQ',
    venue_address: '88 Colin P. Kelly Jr. St, San Francisco, CA 94107',
    platform_source: 'Meetup',
    registration_url: 'https://meetup.com/cloud-infra-sf',
    event_description: 'Monthly meetup for cloud infrastructure engineers covering Kubernetes, serverless, and multi-cloud strategies.',
    estimated_attendee_count: '180',
    organizer_name: 'Derek Nguyen',
    organizer_role: 'Community Organizer',
    organizer_linkedin_url: 'https://linkedin.com/in/dereknguyen',
    organizer_email: 'derek@cloudinfra.dev',
    partnership_url: '',
    cfp_url: 'https://cloudinfra.dev/speak',
    organization_name: 'Cloud Infrastructure SF',
    persona_match_score: 58,
    score_rationale: 'Technical audience with moderate persona overlap. Good for brand awareness among infrastructure engineers. Smaller scale limits lead generation potential.',
    outreach_pitch: 'Derek, we enjoyed the Cloud Infrastructure Meetup and would be interested in sponsoring a future session or providing a lightning talk on our infrastructure tooling.',
    email_subject_line: 'Sponsorship Interest - Cloud Infra Meetup'
  }
]

// ─── Markdown Renderer ──────────────────────────────────────────────────────

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? (
      <strong key={i} className="font-medium text-foreground">{part}</strong>
    ) : (
      part
    )
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-medium text-sm mt-2 mb-1 text-foreground">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-medium text-base mt-2 mb-1 text-foreground">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-medium text-lg mt-3 mb-1 text-foreground">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm text-muted-foreground">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm text-muted-foreground">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm text-muted-foreground leading-relaxed">{formatInline(line)}</p>
      })}
    </div>
  )
}

// ─── Deep Response Extractor ─────────────────────────────────────────────────

function extractDiscoveryResponse(raw: unknown): DiscoveryResponse | null {
  let data = raw
  if (typeof data === 'string') {
    const trimmed = (data as string).trim()
    try { data = JSON.parse(trimmed) } catch {
      const m1 = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (m1 && m1[1]) { try { data = JSON.parse(m1[1].trim()) } catch { /* */ } }
      if (typeof data === 'string') {
        const m2 = trimmed.match(/\{[\s\S]*\}/)
        if (m2) { try { data = JSON.parse(m2[0]) } catch { return null } }
        else return null
      }
    }
  }
  if (!data || typeof data !== 'object') return null

  const obj = data as Record<string, unknown>
  let src: Record<string, unknown> = obj

  // Dig through response.result structure
  if (obj.response && typeof obj.response === 'object') {
    const r = obj.response as Record<string, unknown>
    if (r.result && typeof r.result === 'object' && !Array.isArray(r.result)) {
      src = r.result as Record<string, unknown>
    } else if (r.result && typeof r.result === 'string') {
      try { src = JSON.parse(r.result as string) } catch { /* */ }
    }
  }

  // Also try top-level result
  if (!Array.isArray(src.events) && obj.result && typeof obj.result === 'object' && !Array.isArray(obj.result)) {
    src = obj.result as Record<string, unknown>
  }
  if (!Array.isArray(src.events) && obj.result && typeof obj.result === 'string') {
    try {
      const parsed = JSON.parse(obj.result as string)
      if (parsed && typeof parsed === 'object') src = parsed as Record<string, unknown>
    } catch { /* */ }
  }

  const arr = Array.isArray(src.events) ? src.events : []
  const evs: EventData[] = arr.map((e: Record<string, unknown>) => ({
    event_title: String(e?.event_title ?? 'Untitled Event'),
    event_date: String(e?.event_date ?? ''),
    event_time: String(e?.event_time ?? ''),
    venue_name: String(e?.venue_name ?? ''),
    venue_address: String(e?.venue_address ?? ''),
    platform_source: String(e?.platform_source ?? 'Unknown'),
    registration_url: String(e?.registration_url ?? ''),
    event_description: String(e?.event_description ?? ''),
    estimated_attendee_count: String(e?.estimated_attendee_count ?? ''),
    organizer_name: String(e?.organizer_name ?? ''),
    organizer_role: String(e?.organizer_role ?? ''),
    organizer_linkedin_url: String(e?.organizer_linkedin_url ?? ''),
    organizer_email: String(e?.organizer_email ?? ''),
    partnership_url: String(e?.partnership_url ?? ''),
    cfp_url: String(e?.cfp_url ?? ''),
    organization_name: String(e?.organization_name ?? ''),
    persona_match_score: typeof e?.persona_match_score === 'number' ? e.persona_match_score : Number(e?.persona_match_score) || 0,
    score_rationale: String(e?.score_rationale ?? ''),
    outreach_pitch: String(e?.outreach_pitch ?? ''),
    email_subject_line: String(e?.email_subject_line ?? ''),
  }))

  return {
    events: evs,
    total_events_found: typeof src.total_events_found === 'number' ? src.total_events_found : evs.length,
    search_summary: String(src.search_summary ?? ''),
    enrichment_summary: String(src.enrichment_summary ?? ''),
    overall_strategy_summary: String(src.overall_strategy_summary ?? ''),
  }
}

// ─── Score Gauge ─────────────────────────────────────────────────────────────

function ScoreGauge({ score }: { score: number }) {
  const safeScore = typeof score === 'number' ? Math.min(100, Math.max(0, score)) : 0
  const circumference = 2 * Math.PI * 18
  const offset = circumference - (safeScore / 100) * circumference
  const color = safeScore >= 70 ? '#22c55e' : safeScore >= 40 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative w-14 h-14 flex-shrink-0">
      <svg width="56" height="56" viewBox="0 0 44 44">
        <circle cx="22" cy="22" r="18" fill="none" stroke="hsl(30 6% 20%)" strokeWidth="3" />
        <circle cx="22" cy="22" r="18" fill="none" stroke={color} strokeWidth="3" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="square" transform="rotate(-90 22 22)" />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xs font-medium" style={{ color }}>{safeScore}</span>
      </div>
    </div>
  )
}

// ─── Event Card ──────────────────────────────────────────────────────────────

function EventCard({ event, onClick }: { event: EventData; onClick: () => void }) {
  return (
    <Card className="cursor-pointer border-border bg-card hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 group" onClick={onClick}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="text-[10px] tracking-widest uppercase border-primary/30 text-primary font-normal">{event?.platform_source ?? 'Unknown'}</Badge>
            </div>
            <h3 className="font-medium text-foreground text-sm tracking-wide mb-2 group-hover:text-primary transition-colors line-clamp-2">{event?.event_title ?? 'Untitled Event'}</h3>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <FiCalendar className="w-3 h-3 flex-shrink-0" />
                <span className="text-xs tracking-wide">{event?.event_date ?? 'Date TBD'}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <FiMapPin className="w-3 h-3 flex-shrink-0" />
                <span className="text-xs tracking-wide truncate">{event?.venue_name ?? 'Venue TBD'}</span>
              </div>
            </div>
          </div>
          <ScoreGauge score={event?.persona_match_score ?? 0} />
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Skeleton Cards ──────────────────────────────────────────────────────────

function SkeletonCards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Card key={i} className="border-border bg-card">
          <CardContent className="p-5">
            <div className="flex items-start gap-4">
              <div className="flex-1 space-y-3">
                <Skeleton className="h-4 w-20 bg-muted" />
                <Skeleton className="h-5 w-full bg-muted" />
                <Skeleton className="h-3 w-32 bg-muted" />
                <Skeleton className="h-3 w-40 bg-muted" />
              </div>
              <Skeleton className="h-14 w-14 rounded-full bg-muted" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

// ─── Detail Drawer ───────────────────────────────────────────────────────────

function DetailDrawer({ event, isOpen, onClose, onTrack, isTracked }: {
  event: EventData | null
  isOpen: boolean
  onClose: () => void
  onTrack: (event: EventData) => void
  isTracked: boolean
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null)

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch {
      // Fallback silently
    }
  }

  if (!event || !isOpen) return null

  const mailtoHref = `mailto:${encodeURIComponent(event.organizer_email ?? '')}?subject=${encodeURIComponent(event.email_subject_line ?? '')}&body=${encodeURIComponent(event.outreach_pitch ?? '')}`

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-card border-l border-border shadow-2xl flex flex-col" style={{ animation: 'slideInRight 0.3s ease-out' }}>
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-4">
              <Badge variant="outline" className="text-[10px] tracking-widest uppercase border-primary/30 text-primary font-normal mb-2">{event?.platform_source ?? 'Unknown'}</Badge>
              <h2 className="text-lg font-medium text-foreground tracking-wide leading-tight">{event?.event_title ?? 'Untitled'}</h2>
              <p className="text-xs text-muted-foreground mt-1 tracking-wide">{event?.event_date ?? ''} {event?.event_time ? `/ ${event.event_time}` : ''}</p>
            </div>
            <div className="flex items-center gap-3">
              <ScoreGauge score={event?.persona_match_score ?? 0} />
              <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                <FiX className="w-5 h-5" />
              </button>
            </div>
          </div>
          {event?.event_description && (
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed tracking-wide line-clamp-3">{event.event_description}</p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue="who" className="flex flex-col h-full">
            <TabsList className="w-full justify-start border-b border-border bg-transparent p-0 h-auto">
              <TabsTrigger value="who" className="text-xs tracking-[0.12em] uppercase font-normal px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent bg-transparent text-muted-foreground">The Who</TabsTrigger>
              <TabsTrigger value="how" className="text-xs tracking-[0.12em] uppercase font-normal px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent bg-transparent text-muted-foreground">The How</TabsTrigger>
              <TabsTrigger value="where" className="text-xs tracking-[0.12em] uppercase font-normal px-6 py-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent bg-transparent text-muted-foreground">The Where</TabsTrigger>
            </TabsList>

            <ScrollArea className="flex-1">
              {/* THE WHO */}
              <TabsContent value="who" className="p-6 space-y-5 mt-0">
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground block mb-1">Organizer</span>
                    <p className="text-sm font-medium text-foreground tracking-wide">{event?.organizer_name ?? 'Data unavailable'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground block mb-1">Role</span>
                    <p className="text-sm text-foreground tracking-wide">{event?.organizer_role ?? 'Data unavailable'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground block mb-1">Organization</span>
                    <p className="text-sm text-foreground tracking-wide">{event?.organization_name ?? 'Data unavailable'}</p>
                  </div>
                  <Separator className="bg-border" />
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground block mb-2">Contact</span>
                    <div className="space-y-2">
                      {event?.organizer_linkedin_url && (
                        <a href={event.organizer_linkedin_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-primary hover:text-accent transition-colors tracking-wide">
                          <FiLinkedin className="w-4 h-4" />
                          <span>LinkedIn Profile</span>
                          <FiExternalLink className="w-3 h-3 ml-auto" />
                        </a>
                      )}
                      {event?.organizer_email && (
                        <div className="flex items-center gap-2">
                          <FiMail className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm text-foreground tracking-wide flex-1">{event.organizer_email}</span>
                          <button type="button" onClick={() => copyToClipboard(event.organizer_email, 'email')} className="text-muted-foreground hover:text-primary transition-colors p-1">
                            {copiedField === 'email' ? <FiCheck className="w-3.5 h-3.5 text-green-500" /> : <FiCopy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  <Separator className="bg-border" />
                  {event?.organizer_email && (
                    <a href={mailtoHref} className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-xs tracking-[0.12em] uppercase font-medium hover:bg-primary/90 transition-colors">
                      <FiSend className="w-3.5 h-3.5" />
                      Draft Email
                    </a>
                  )}
                </div>
              </TabsContent>

              {/* THE HOW */}
              <TabsContent value="how" className="p-6 space-y-5 mt-0">
                <div className="space-y-4">
                  {event?.partnership_url && (
                    <a href={event.partnership_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 border border-primary/30 text-primary text-xs tracking-[0.12em] uppercase hover:bg-primary/10 transition-colors w-full">
                      <FiExternalLink className="w-3.5 h-3.5" />
                      Partnership Page
                    </a>
                  )}
                  {event?.cfp_url && (
                    <a href={event.cfp_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 border border-primary/30 text-primary text-xs tracking-[0.12em] uppercase hover:bg-primary/10 transition-colors w-full">
                      <FiExternalLink className="w-3.5 h-3.5" />
                      Call for Proposals
                    </a>
                  )}
                  {!event?.partnership_url && !event?.cfp_url && (
                    <p className="text-sm text-muted-foreground tracking-wide">No partnership or CFP links available for this event.</p>
                  )}
                  <Separator className="bg-border" />
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground block mb-2">AI Outreach Pitch</span>
                    <div className="border-l-2 border-primary/40 pl-4 py-2 bg-secondary/30">
                      <p className="text-sm text-foreground leading-relaxed tracking-wide italic">{event?.outreach_pitch ?? 'No pitch generated.'}</p>
                    </div>
                    <button type="button" onClick={() => copyToClipboard(event?.outreach_pitch ?? '', 'pitch')} className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors tracking-wide">
                      {copiedField === 'pitch' ? <><FiCheck className="w-3 h-3 text-green-500" /> Copied</> : <><FiCopy className="w-3 h-3" /> Copy Pitch</>}
                    </button>
                  </div>
                  <Separator className="bg-border" />
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground block mb-2">Email Subject</span>
                    <div className="flex items-center gap-2">
                      <p className="text-sm text-foreground tracking-wide flex-1">{event?.email_subject_line ?? 'No subject line.'}</p>
                      <button type="button" onClick={() => copyToClipboard(event?.email_subject_line ?? '', 'subject')} className="text-muted-foreground hover:text-primary transition-colors p-1 flex-shrink-0">
                        {copiedField === 'subject' ? <FiCheck className="w-3.5 h-3.5 text-green-500" /> : <FiCopy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <Separator className="bg-border" />
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground block mb-2">Score Rationale</span>
                    {renderMarkdown(event?.score_rationale ?? '')}
                  </div>
                </div>
              </TabsContent>

              {/* THE WHERE */}
              <TabsContent value="where" className="p-6 space-y-5 mt-0">
                <div className="space-y-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground block mb-1">Venue</span>
                    <p className="text-sm font-medium text-foreground tracking-wide">{event?.venue_name ?? 'Data unavailable'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground block mb-1">Address</span>
                    <p className="text-sm text-foreground tracking-wide">{event?.venue_address ?? 'Data unavailable'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground block mb-1">Estimated Attendees</span>
                    <div className="flex items-center gap-2">
                      <FiUsers className="w-4 h-4 text-primary" />
                      <span className="text-sm text-foreground tracking-wide">{event?.estimated_attendee_count ?? 'Data unavailable'}</span>
                    </div>
                  </div>
                  <Separator className="bg-border" />
                  {event?.registration_url && (
                    <a href={event.registration_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground text-xs tracking-[0.12em] uppercase font-medium hover:bg-primary/90 transition-colors">
                      <FiExternalLink className="w-3.5 h-3.5" />
                      Registration Page
                    </a>
                  )}
                </div>
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <Button type="button" onClick={() => onTrack(event)} disabled={isTracked} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 tracking-[0.12em] uppercase text-xs font-medium py-5">
            {isTracked ? (
              <><FiCheck className="w-4 h-4 mr-2" /> Tracked in Pipeline</>
            ) : (
              <><FiPlus className="w-4 h-4 mr-2" /> Track in Pipeline</>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Pipeline Card ───────────────────────────────────────────────────────────

function PipelineCard({ event, onStatusChange, onClick }: {
  event: PipelineEvent
  onStatusChange: (status: PipelineStatus) => void
  onClick: () => void
}) {
  return (
    <Card className="bg-card border-border hover:border-primary/30 transition-all duration-200 cursor-pointer" onClick={onClick}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-xs font-medium text-foreground tracking-wide leading-snug flex-1 line-clamp-2">{event?.event_title ?? 'Untitled'}</h4>
          <ScoreGauge score={event?.persona_match_score ?? 0} />
        </div>
        <div className="space-y-1">
          <p className="text-[11px] text-muted-foreground tracking-wide">{event?.organizer_name ?? 'Unknown organizer'}</p>
          <p className="text-[11px] text-muted-foreground tracking-wide">{event?.event_date ?? ''}</p>
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <Select value={event.pipeline_status} onValueChange={(val) => onStatusChange(val as PipelineStatus)}>
            <SelectTrigger className="h-8 text-[10px] tracking-[0.12em] uppercase bg-secondary/50 border-border text-muted-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {PIPELINE_COLUMNS.map((status) => (
                <SelectItem key={status} value={status} className="text-[11px] tracking-wide text-popover-foreground">{status}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function Page() {
  // ── Navigation ──
  const [activeView, setActiveView] = useState<'discover' | 'outreach' | 'past'>('discover')

  // ── Lifted chip + input state (FIX A) ──
  const [locationChips, setLocationChips] = useState<string[]>([])
  const [personaChips, setPersonaChips] = useState<string[]>([])
  const [domainChips, setDomainChips] = useState<string[]>([])
  const [locationInput, setLocationInput] = useState('')
  const [personaInput, setPersonaInput] = useState('')
  const [domainInput, setDomainInput] = useState('')

  // ── Past Events State ──
  const [pastEvents, setPastEvents] = useState<EventData[]>([])

  // ── Search State ──
  const [events, setEvents] = useState<EventData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'score' | 'date'>('score')
  const [searchMeta, setSearchMeta] = useState<Partial<DiscoveryResponse>>({})
  const [statusMessage, setStatusMessage] = useState('')

  // ── Drawer State ──
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // ── Pipeline State ──
  const [pipeline, setPipeline] = useState<PipelineEvent[]>([])
  const [pipelineFilter, setPipelineFilter] = useState<string>('all')

  // ── Sample Data Toggle ──
  const [showSample, setShowSample] = useState(false)

  // ── Active Agent Tracking ──
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // ── Notification bar ──
  const [notification, setNotification] = useState<string | null>(null)
  const notify = useCallback((msg: string) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3000)
  }, [])

  // ── Load pipeline from localStorage ──
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PIPELINE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setPipeline(parsed)
        }
      }
    } catch {
      // Ignore parse errors
    }
  }, [])

  // ── Save pipeline to localStorage ──
  const savePipeline = useCallback((updated: PipelineEvent[]) => {
    setPipeline(updated)
    try {
      localStorage.setItem(PIPELINE_KEY, JSON.stringify(updated))
    } catch {
      // Ignore storage errors
    }
  }, [])

  // ── Chip key handler ──
  const onChipKey = useCallback((e: React.KeyboardEvent<HTMLInputElement>, val: string, setVal: (v: string) => void, chips: string[], setChips: (c: string[]) => void) => {
    if ((e.key === 'Enter' || e.key === ',') && val.trim()) {
      e.preventDefault()
      setChips([...chips, val.trim()])
      setVal('')
    }
    if (e.key === 'Backspace' && !val && chips.length > 0) {
      setChips(chips.slice(0, -1))
    }
  }, [])

  // ── Button enable check: chips AND typed text (FIX B) ──
  const hasAnyInput = locationChips.length > 0 || locationInput.trim().length > 0 ||
    personaChips.length > 0 || personaInput.trim().length > 0 ||
    domainChips.length > 0 || domainInput.trim().length > 0

  // ── Discover Events (FIX C, D, F) ──
  const handleDiscover = useCallback(async () => {
    // Auto-commit typed text into chips (FIX C)
    const newLocChips = [...locationChips]
    const newPerChips = [...personaChips]
    const newDomChips = [...domainChips]

    if (locationInput.trim()) {
      newLocChips.push(locationInput.trim())
      setLocationChips(newLocChips)
      setLocationInput('')
    }
    if (personaInput.trim()) {
      newPerChips.push(personaInput.trim())
      setPersonaChips(newPerChips)
      setPersonaInput('')
    }
    if (domainInput.trim()) {
      newDomChips.push(domainInput.trim())
      setDomainChips(newDomChips)
      setDomainInput('')
    }

    if (newLocChips.length === 0 && newPerChips.length === 0 && newDomChips.length === 0) return

    setLoading(true)
    setError(null)
    setEvents([])
    setSearchMeta({})
    setActiveAgentId(AGENT_ID)
    setStatusMessage('Connecting to discovery agent...')

    const message = `Search for upcoming events with the following criteria:
- Location: ${newLocChips.join(', ') || 'Any'}
- Target Persona: ${newPerChips.join(', ') || 'Any'}
- Domain: ${newDomChips.join(', ') || 'Any'}

Find relevant events on LinkedIn Events, Luma, Eventbrite, and Meetup. Filter for events from today onwards. Enrich each event with organizer contact details and partnership links. Score each event for persona-domain alignment and draft outreach pitches.`

    try {
      setStatusMessage('Searching events across platforms...')
      const result = await callAIAgent(message, AGENT_ID)

      if (result && result.success) {
        setStatusMessage('Processing results...')

        // Deep extraction with multiple fallback paths (FIX F)
        let parsed = extractDiscoveryResponse(result?.response?.result)
        if ((!parsed || parsed.events.length === 0) && result?.response?.message) {
          parsed = extractDiscoveryResponse(result.response.message)
        }
        if ((!parsed || parsed.events.length === 0) && result?.response) {
          parsed = extractDiscoveryResponse(result.response)
        }
        if ((!parsed || parsed.events.length === 0) && (result as Record<string, unknown>)?.raw_response) {
          parsed = extractDiscoveryResponse((result as Record<string, unknown>).raw_response)
        }
        if (!parsed || parsed.events.length === 0) {
          parsed = extractDiscoveryResponse(result)
        }

        if (parsed && Array.isArray(parsed.events) && parsed.events.length > 0) {
          const today = new Date().toISOString().split('T')[0]
          const upcoming = parsed.events.filter(ev => (ev?.event_date ?? '') >= today)
          const past = parsed.events.filter(ev => (ev?.event_date ?? '') < today && (ev?.event_date ?? '') !== '')
          setEvents(upcoming)
          if (past.length > 0) {
            setPastEvents(prev => {
              const existing = new Set(prev.map(p => `${p.event_title}|${p.event_date}`))
              const newPast = past.filter(p => !existing.has(`${p.event_title}|${p.event_date}`))
              return [...prev, ...newPast]
            })
          }
          setSearchMeta({
            total_events_found: parsed.total_events_found,
            search_summary: parsed.search_summary,
            enrichment_summary: parsed.enrichment_summary,
            overall_strategy_summary: parsed.overall_strategy_summary
          })
          notify(`Found ${upcoming.length} upcoming${past.length > 0 ? ` and ${past.length} past` : ''} events`)
        } else {
          setError('No events found. Try broadening your search criteria.')
        }
      } else {
        setError((result as Record<string, unknown>)?.error as string ?? 'Failed to discover events. Please try again.')
      }
    } catch {
      setError('Network error. Please check your connection and try again.')
    } finally {
      setLoading(false)
      setActiveAgentId(null)
      setStatusMessage('')
    }
  // FIX D: NO agentActivity in deps
  }, [locationChips, personaChips, domainChips, locationInput, personaInput, domainInput, notify])

  // ── Track event in pipeline ──
  const trackEvent = useCallback((event: EventData) => {
    const exists = pipeline.some(p => p.event_title === event.event_title && p.event_date === event.event_date)
    if (exists) return
    const newEntry: PipelineEvent = {
      ...event,
      pipeline_status: 'Saved',
      tracked_at: new Date().toISOString()
    }
    savePipeline([...pipeline, newEntry])
    notify('Event added to pipeline')
  }, [pipeline, savePipeline, notify])

  // ── Check if event is tracked ──
  const isEventTracked = useCallback((event: EventData) => {
    return pipeline.some(p => p.event_title === event.event_title && p.event_date === event.event_date)
  }, [pipeline])

  // ── Update pipeline status ──
  const updatePipelineStatus = useCallback((index: number, status: PipelineStatus) => {
    const updated = [...pipeline]
    if (updated[index]) {
      updated[index] = { ...updated[index], pipeline_status: status }
      savePipeline(updated)
    }
  }, [pipeline, savePipeline])

  // ── Display events (sorted) ──
  const displayEvents = showSample ? SAMPLE_EVENTS : events
  const sortedEvents = [...displayEvents].sort((a, b) => {
    if (sortBy === 'score') return (b?.persona_match_score ?? 0) - (a?.persona_match_score ?? 0)
    return (a?.event_date ?? '').localeCompare(b?.event_date ?? '')
  })

  // ── Pipeline events filtered ──
  const filteredPipeline = pipelineFilter === 'all'
    ? pipeline
    : pipeline.filter(p => (p?.organization_name ?? '').toLowerCase().includes(pipelineFilter.toLowerCase()))

  // ── Unique domains from pipeline for filter ──
  const pipelineDomains = Array.from(new Set(pipeline.map(p => p?.organization_name ?? '').filter(Boolean)))

  // ── Chip field renderer (inline, parent owns state) ──
  const chipField = (label: string, icon: React.ReactNode, chips: string[], setChips: (c: string[]) => void, val: string, setVal: (v: string) => void, ph: string) => (
    <div className="flex-1 min-w-[180px]">
      <label className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-normal mb-1.5 block">{label}</label>
      <div className="flex items-center flex-wrap gap-1.5 bg-secondary/50 border border-border px-3 py-2 min-h-[40px] focus-within:border-primary/50 transition-colors">
        {icon}
        {chips.map((c, i) => (
          <span key={i} className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-primary/15 text-primary text-xs tracking-wide border border-primary/20">
            {c}
            <button type="button" onClick={(e) => { e.stopPropagation(); setChips(chips.filter((_, j) => j !== i)) }} className="hover:text-foreground ml-0.5">
              <FiX className="w-3 h-3" />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => onChipKey(e, val, setVal, chips, setChips)}
          placeholder={chips.length > 0 ? '' : ph}
          className="flex-1 min-w-[80px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none tracking-wide"
        />
      </div>
    </div>
  )

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* ── Notification Bar ── */}
      {notification && (
        <div className="fixed top-4 right-4 z-[60] px-4 py-2.5 bg-primary text-primary-foreground text-xs tracking-[0.12em] uppercase font-medium shadow-lg" style={{ animation: 'slideInRight 0.2s ease-out' }}>
          {notification}
        </div>
      )}

      {/* ── Sidebar ── */}
      <aside className="w-[220px] flex-shrink-0 bg-[hsl(30_7%_7%)] border-r border-[hsl(30_6%_16%)] flex flex-col">
        <div className="p-6 border-b border-[hsl(30_6%_16%)]">
          <div className="flex items-center gap-2.5">
            <HiOutlineSparkles className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium tracking-[0.12em] uppercase text-foreground">Lead-Gen</span>
          </div>
          <p className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground mt-1">Event Architect</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button type="button" onClick={() => setActiveView('discover')} className={`w-full flex items-center gap-3 px-4 py-3 text-xs tracking-[0.12em] uppercase transition-all duration-200 ${activeView === 'discover' ? 'bg-[hsl(30_5%_12%)] text-primary border-l-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-[hsl(30_5%_12%)] border-l-2 border-transparent'}`}>
            <FiCompass className="w-4 h-4" />
            Discover
          </button>
          <button type="button" onClick={() => setActiveView('past')} className={`w-full flex items-center gap-3 px-4 py-3 text-xs tracking-[0.12em] uppercase transition-all duration-200 ${activeView === 'past' ? 'bg-[hsl(30_5%_12%)] text-primary border-l-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-[hsl(30_5%_12%)] border-l-2 border-transparent'}`}>
            <FiCalendar className="w-4 h-4" />
            Past Events
            {(showSample ? SAMPLE_PAST_EVENTS.length : pastEvents.length) > 0 && (
              <span className="ml-auto text-[10px] bg-primary/15 text-primary px-1.5 py-0.5">{showSample ? SAMPLE_PAST_EVENTS.length : pastEvents.length}</span>
            )}
          </button>
          <button type="button" onClick={() => setActiveView('outreach')} className={`w-full flex items-center gap-3 px-4 py-3 text-xs tracking-[0.12em] uppercase transition-all duration-200 ${activeView === 'outreach' ? 'bg-[hsl(30_5%_12%)] text-primary border-l-2 border-primary' : 'text-muted-foreground hover:text-foreground hover:bg-[hsl(30_5%_12%)] border-l-2 border-transparent'}`}>
            <FiSend className="w-4 h-4" />
            My Outreach
            {pipeline.length > 0 && (
              <span className="ml-auto text-[10px] bg-primary/15 text-primary px-1.5 py-0.5">{pipeline.length}</span>
            )}
          </button>
        </nav>

        {/* Agent Status */}
        <div className="p-4 border-t border-[hsl(30_6%_16%)]">
          <div className="space-y-2">
            <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground block">Agents</span>
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${activeAgentId ? 'bg-primary animate-pulse' : 'bg-muted-foreground/40'}`} />
              <span className="text-[10px] text-muted-foreground tracking-wide">Event Discovery Coordinator</span>
            </div>
            <p className="text-[9px] text-muted-foreground/60 tracking-wide leading-relaxed">Manages search, enrichment, and scoring sub-agents</p>
          </div>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ── Top Bar ── */}
        <header className="flex-shrink-0 border-b border-border bg-card/50 p-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-sm font-medium tracking-[0.12em] uppercase text-foreground">
              {activeView === 'discover' ? 'Event Discovery' : activeView === 'past' ? 'Past Events' : 'Outreach Pipeline'}
            </h1>
            <label className="text-[10px] tracking-[0.12em] uppercase text-muted-foreground cursor-pointer flex items-center gap-2">
              Sample preview
              <input type="checkbox" checked={showSample} onChange={(e) => { setShowSample(e.target.checked); if (e.target.checked) { setSearchMeta({ ...SAMPLE_SUMMARY }); } else { if (events.length === 0) setSearchMeta({}); } }} className="w-3.5 h-3.5 cursor-pointer accent-[hsl(40,50%,55%)]" />
            </label>
          </div>

          {activeView === 'discover' && (
            <div className="flex items-end gap-3 flex-wrap">
              {chipField('Location', <FiMapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />, locationChips, setLocationChips, locationInput, setLocationInput, 'e.g. San Francisco')}
              {chipField('Persona', <FiUsers className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />, personaChips, setPersonaChips, personaInput, setPersonaInput, 'e.g. CTO, VP Eng')}
              {chipField('Domain', <FiSearch className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />, domainChips, setDomainChips, domainInput, setDomainInput, 'e.g. AI, SaaS')}
              {/* FIX E: Native <button> for Discover Events to avoid shadcn disabled:pointer-events-none */}
              <button
                type="button"
                onClick={handleDiscover}
                disabled={loading || !hasAnyInput}
                style={{ height: 40 }}
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap px-6 text-xs tracking-[0.12em] uppercase font-medium transition-all duration-200 cursor-pointer select-none bg-[hsl(40,50%,55%)] text-[hsl(30,8%,6%)] hover:bg-[hsl(40,50%,48%)] active:bg-[hsl(40,50%,42%)] disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0"
              >
                {loading ? (
                  <><FiRefreshCw className="w-3.5 h-3.5 animate-spin" /> Searching...</>
                ) : (
                  <><HiOutlineSparkles className="w-3.5 h-3.5" /> Discover Events</>
                )}
              </button>
            </div>
          )}
        </header>

        {/* ── Content Area ── */}
        <div className="flex-1 overflow-y-auto">
          {activeView === 'discover' ? (
            <div className="p-6">
              {/* Status message during loading */}
              {loading && statusMessage && (
                <div className="mb-4 flex items-center gap-3 p-3 bg-secondary/20 border border-border">
                  <FiRefreshCw className="w-3.5 h-3.5 text-primary animate-spin flex-shrink-0" />
                  <span className="text-xs text-muted-foreground tracking-wide">{statusMessage}</span>
                </div>
              )}

              {/* Summary Bar */}
              {(searchMeta?.search_summary || (showSample && SAMPLE_SUMMARY?.search_summary)) && (
                <div className="mb-5 p-4 bg-secondary/30 border border-border">
                  <div className="flex items-start gap-3">
                    <HiOutlineSparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <div className="space-y-2 flex-1">
                      <p className="text-xs text-foreground tracking-wide leading-relaxed">{showSample ? SAMPLE_SUMMARY.search_summary : searchMeta.search_summary}</p>
                      {(showSample ? SAMPLE_SUMMARY.overall_strategy_summary : searchMeta.overall_strategy_summary) && (
                        <p className="text-xs text-muted-foreground tracking-wide leading-relaxed">{showSample ? SAMPLE_SUMMARY.overall_strategy_summary : searchMeta.overall_strategy_summary}</p>
                      )}
                    </div>
                    <Badge variant="outline" className="text-[10px] tracking-widest border-primary/30 text-primary flex-shrink-0">{showSample ? SAMPLE_SUMMARY.total_events_found : searchMeta.total_events_found} found</Badge>
                  </div>
                </div>
              )}

              {/* Sort Bar */}
              {sortedEvents.length > 0 && (
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{sortedEvents.length} event{sortedEvents.length !== 1 ? 's' : ''}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Sort by</span>
                    <Select value={sortBy} onValueChange={(val) => setSortBy(val as 'score' | 'date')}>
                      <SelectTrigger className="h-7 w-[130px] text-[10px] tracking-[0.12em] uppercase bg-secondary/50 border-border text-foreground">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="score" className="text-[11px] tracking-wide text-popover-foreground">Relevance Score</SelectItem>
                        <SelectItem value="date" className="text-[11px] tracking-wide text-popover-foreground">Date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Loading State */}
              {loading && <SkeletonCards />}

              {/* Error State */}
              {error && !loading && (
                <div className="flex flex-col items-center justify-center py-16">
                  <p className="text-sm text-muted-foreground tracking-wide mb-4">{error}</p>
                  <Button type="button" onClick={handleDiscover} variant="outline" className="text-xs tracking-[0.12em] uppercase border-border text-foreground hover:bg-secondary">
                    Retry Search
                  </Button>
                </div>
              )}

              {/* Event Grid */}
              {!loading && !error && sortedEvents.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {sortedEvents.map((event, idx) => (
                    <EventCard key={`${event?.event_title ?? 'event'}-${idx}`} event={event} onClick={() => { setSelectedEvent(event); setDrawerOpen(true); }} />
                  ))}
                </div>
              )}

              {/* Empty State */}
              {!loading && !error && sortedEvents.length === 0 && !showSample && (
                <div className="flex flex-col items-center justify-center py-20">
                  <FiCompass className="w-10 h-10 text-muted-foreground/30 mb-4" />
                  <p className="text-sm text-muted-foreground tracking-wide mb-1">
                    Enter your criteria above to discover events
                  </p>
                  <p className="text-xs text-muted-foreground/60 tracking-wide">
                    Add location, persona, or domain and click Discover Events
                  </p>
                </div>
              )}

              {/* Enrichment / Strategy Summary below cards */}
              {!loading && (searchMeta?.enrichment_summary || (showSample && SAMPLE_SUMMARY?.enrichment_summary)) && sortedEvents.length > 0 && (
                <div className="mt-6 p-4 bg-secondary/20 border border-border">
                  <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground block mb-2">Enrichment Summary</span>
                  <p className="text-xs text-muted-foreground tracking-wide leading-relaxed">{showSample ? SAMPLE_SUMMARY.enrichment_summary : searchMeta.enrichment_summary}</p>
                </div>
              )}
            </div>
          ) : activeView === 'past' ? (
            /* ── Past Events View ── */
            <div className="p-6">
              {(() => {
                const displayPastEvents = showSample ? SAMPLE_PAST_EVENTS : pastEvents
                const sortedPast = [...displayPastEvents].sort((a, b) => {
                  if (sortBy === 'score') return (b?.persona_match_score ?? 0) - (a?.persona_match_score ?? 0)
                  return (b?.event_date ?? '').localeCompare(a?.event_date ?? '')
                })

                return (
                  <>
                    {/* Sort Bar */}
                    {sortedPast.length > 0 && (
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{sortedPast.length} past event{sortedPast.length !== 1 ? 's' : ''}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Sort by</span>
                          <Select value={sortBy} onValueChange={(val) => setSortBy(val as 'score' | 'date')}>
                            <SelectTrigger className="h-7 w-[130px] text-[10px] tracking-[0.12em] uppercase bg-secondary/50 border-border text-foreground">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-popover border-border">
                              <SelectItem value="score" className="text-[11px] tracking-wide text-popover-foreground">Relevance Score</SelectItem>
                              <SelectItem value="date" className="text-[11px] tracking-wide text-popover-foreground">Date</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {/* Past Events Grid */}
                    {sortedPast.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {sortedPast.map((event, idx) => (
                          <div key={`past-${event?.event_title ?? 'event'}-${idx}`} className="relative">
                            <EventCard event={event} onClick={() => { setSelectedEvent(event); setDrawerOpen(true); }} />
                            <span className="absolute top-3 right-3 text-[9px] uppercase tracking-[0.15em] text-muted-foreground font-medium bg-secondary/80 px-1.5 py-0.5 border border-border">Past</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20">
                        <FiCalendar className="w-10 h-10 text-muted-foreground/30 mb-4" />
                        <p className="text-sm text-muted-foreground tracking-wide mb-1">No past events found</p>
                        <p className="text-xs text-muted-foreground/60 tracking-wide">Past events from your searches will appear here.</p>
                      </div>
                    )}
                  </>
                )
              })()}
            </div>
          ) : (
            /* ── Outreach Pipeline ── */
            <div className="p-6">
              {/* Pipeline Header */}
              <div className="flex items-center justify-between mb-6">
                <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{pipeline.length} event{pipeline.length !== 1 ? 's' : ''} in pipeline</span>
                {pipelineDomains.length > 0 && (
                  <div className="flex items-center gap-2">
                    <FiFilter className="w-3 h-3 text-muted-foreground" />
                    <Select value={pipelineFilter} onValueChange={setPipelineFilter}>
                      <SelectTrigger className="h-7 w-[160px] text-[10px] tracking-[0.12em] uppercase bg-secondary/50 border-border text-foreground">
                        <SelectValue placeholder="All Organizations" />
                      </SelectTrigger>
                      <SelectContent className="bg-popover border-border">
                        <SelectItem value="all" className="text-[11px] tracking-wide text-popover-foreground">All Organizations</SelectItem>
                        {pipelineDomains.map((d) => (
                          <SelectItem key={d} value={d} className="text-[11px] tracking-wide text-popover-foreground">{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Kanban Columns */}
              {pipeline.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <FiSend className="w-10 h-10 text-muted-foreground/30 mb-4" />
                  <p className="text-sm text-muted-foreground tracking-wide mb-1">Discover events to start tracking</p>
                  <p className="text-xs text-muted-foreground/60 tracking-wide">Events you track will appear here in your pipeline</p>
                  <Button type="button" onClick={() => setActiveView('discover')} variant="outline" className="mt-4 text-xs tracking-[0.12em] uppercase border-border text-foreground hover:bg-secondary">
                    <FiCompass className="w-3.5 h-3.5 mr-2" /> Go to Discover
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {PIPELINE_COLUMNS.map((column) => {
                    const columnEvents = filteredPipeline.filter(p => p.pipeline_status === column)
                    return (
                      <div key={column} className="space-y-3">
                        <div className="flex items-center justify-between pb-2 border-b border-border">
                          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{column}</span>
                          <span className="text-[10px] text-muted-foreground/60">{columnEvents.length}</span>
                        </div>
                        <div className="space-y-3 min-h-[200px]">
                          {columnEvents.length === 0 ? (
                            <div className="flex items-center justify-center py-8">
                              <p className="text-[10px] text-muted-foreground/40 tracking-wide text-center">No events</p>
                            </div>
                          ) : (
                            columnEvents.map((event) => {
                              const realIndex = pipeline.findIndex(p => p.event_title === event.event_title && p.event_date === event.event_date)
                              return (
                                <PipelineCard key={`${event?.event_title}-${event?.event_date}`} event={event} onStatusChange={(status) => updatePipelineStatus(realIndex, status)} onClick={() => { setSelectedEvent(event); setDrawerOpen(true); }} />
                              )
                            })
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* ── Detail Drawer ── */}
      <DetailDrawer event={selectedEvent} isOpen={drawerOpen} onClose={() => { setDrawerOpen(false); setSelectedEvent(null); }} onTrack={trackEvent} isTracked={selectedEvent ? isEventTracked(selectedEvent) : false} />
    </div>
  )
}
