import { useAuth } from '../../auth/AuthContext'
import { BackgroundFooter } from '../../components/BackgroundRenderer'
import { useCosmetics } from '../../contexts/CosmeticsContext'
import { promptUser } from '../format'
import MobilePage from '../MobilePage'
import GreetingHeader from './GreetingHeader'
import HistorySection from './HistorySection'
import NextActionSection from './NextActionSection'
import StatusSection from './StatusSection'
import { useDashboardData } from './useDashboardData'

export default function DashboardMobile() {
  const { user } = useAuth()
  const { bg } = useCosmetics()
  const data = useDashboardData()
  const shellUser = promptUser(user?.name ?? '')

  return (
    <MobilePage background={<BackgroundFooter height={700} config={bg('bg_dashboard')} />}>
      <GreetingHeader name={user?.name ?? ''} />
      <StatusSection stats={data.stats} insights={data.insights} user={shellUser} />
      <NextActionSection resume={data.resume} exercises={data.exercises} user={shellUser} />
      <HistorySection recent={data.recent} user={shellUser} />
    </MobilePage>
  )
}
