import MobilePage from '../MobilePage'
import SectionState from '../SectionState'
import BadgesSection from './BadgesSection'
import BioRow from './BioRow'
import HeatmapSection from './HeatmapSection'
import IdentitySection from './IdentitySection'
import SocialRows from './SocialRows'
import { useProfileData } from './useProfileData'

export default function ProfileMobile() {
  const { stats } = useProfileData()
  const s = stats.data

  return (
    <MobilePage header={<IdentitySection stats={stats} />}>
      <SectionState status={stats.status === 'ready' ? 'ready' : 'loading'}>
        {s && (
          <>
            <HeatmapSection heatmap={s.heatmap ?? {}} />
            <BadgesSection stats={s} />
            <BioRow initialBio={s.user.bio} />
            <SocialRows initialLinks={s.user.social_links ?? {}} />
          </>
        )}
      </SectionState>
    </MobilePage>
  )
}
