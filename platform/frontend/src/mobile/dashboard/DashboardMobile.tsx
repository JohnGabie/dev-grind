import { useAuth } from '../../auth/AuthContext'
import { BackgroundFooter } from '../../components/BackgroundRenderer'
import { useCosmetics } from '../../contexts/CosmeticsContext'
import { promptUser } from '../format'
import { useMediaQuery } from '../../hooks/useMediaQuery'
import MobilePage from '../MobilePage'
import { SHORT_QUERY } from '../screen'
import BrandRow from './BrandRow'
import GreetingHeader from './GreetingHeader'
import NextActionSection from './NextActionSection'
import StatusSection from './StatusSection'
import { useDashboardData } from './useDashboardData'

export default function DashboardMobile() {
  const { user } = useAuth()
  const { bg } = useCosmetics()
  const data = useDashboardData()
  const short = useMediaQuery(SHORT_QUERY)
  const shellUser = promptUser(user?.name ?? '')

  return (
    <MobilePage background={<BackgroundFooter height="100%" config={bg('bg_dashboard')} />}>
      {!short && <BrandRow />}
      <GreetingHeader name={user?.name ?? ''} />
      <StatusSection stats={data.stats} insights={data.insights} recent={data.recent} user={shellUser} />
      <NextActionSection resume={data.resume} exercises={data.exercises} user={shellUser} />
    </MobilePage>
  )
}
