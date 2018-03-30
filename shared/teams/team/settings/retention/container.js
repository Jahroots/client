// @flow
import * as TeamsGen from '../../../../actions/teams-gen'
import {createSetConvRetentionPolicy} from '../../../../actions/chat2-gen'
import {
  connect,
  compose,
  lifecycle,
  setDisplayName,
  withStateHandlers,
  withHandlers,
  type TypedState,
} from '../../../../util/container'
import {getTeamRetentionPolicy, retentionPolicies} from '../../../../constants/teams'
import {getConversationRetentionPolicy} from '../../../../constants/chat2/meta'
import {type RetentionPolicy} from '../../../../constants/types/teams'
import {navigateTo, pathSelector} from '../../../../actions/route-tree'
import {type Path} from '../../../../route-tree'
import type {ConversationIDKey} from '../../../../constants/types/chat2'
import RetentionPicker from './'

export type OwnProps = {
  conversationIDKey?: ConversationIDKey,
  entityType: 'adhoc' | 'channel' | 'small team' | 'big team',
  teamname?: string,
  type: 'simple' | 'auto',
  onSelect?: (policy: RetentionPolicy, changed: boolean, decreased: boolean) => void,
}

const mapStateToProps = (state: TypedState, ownProps: OwnProps) => {
  let policy: RetentionPolicy = retentionPolicies.policyRetain
  let teamPolicy: ?RetentionPolicy
  let showInheritOption = false
  let showOverrideNotice = false
  let loading = false

  switch (ownProps.entityType) {
    case 'adhoc':
      if (!ownProps.conversationIDKey) {
        throw new Error('RetentionPicker needs a conversationIDKey to set adhoc retention policies')
      }
      policy = getConversationRetentionPolicy(state, ownProps.conversationIDKey)
      showInheritOption = false
      showOverrideNotice = false
      break
    case 'channel':
      if (!(ownProps.conversationIDKey && ownProps.teamname)) {
        throw new Error(
          'RetentionPicker needs a conversationIDKey AND teamname to set channel retention policies'
        )
      }
      policy = getConversationRetentionPolicy(state, ownProps.conversationIDKey)
      teamPolicy = (ownProps.teamname && getTeamRetentionPolicy(state, ownProps.teamname)) || null
      loading = !teamPolicy
      showInheritOption = true
      showOverrideNotice = false
      break
    case 'small team':
      if (!ownProps.teamname) {
        throw new Error('RetentionPicker needs a teamname to set small team retention policies')
      }
      let tempPolicy = getTeamRetentionPolicy(state, ownProps.teamname)
      loading = !tempPolicy
      if (tempPolicy) {
        policy = tempPolicy
      }
      showInheritOption = false
      showOverrideNotice = false
      break
    case 'big team':
      if (!ownProps.teamname) {
        throw new Error('RetentionPicker needs a teamname to set big team retention policies')
      }
      let tempPolicy2 = getTeamRetentionPolicy(state, ownProps.teamname)
      loading = !tempPolicy2
      if (tempPolicy2) {
        policy = tempPolicy2
      }
      showInheritOption = false
      showOverrideNotice = true
      break
    default:
      // eslint-disable-next-line no-unused-expressions
      ;(ownProps.entityType: empty)
      throw new Error(`RetentionPicker: impossible entityType encountered: ${ownProps.entityType}`)
  }

  const _path = pathSelector(state)
  return {
    _path,
    loading,
    policy,
    showInheritOption,
    showOverrideNotice,
    teamPolicy,
  }
}

const mapDispatchToProps = (
  dispatch: Dispatch,
  {conversationIDKey, entityType, teamname, onSelect, type}: OwnProps
) => ({
  _loadTeamPolicy: () => teamname && dispatch(TeamsGen.createGetTeamRetentionPolicy({teamname})),
  _onShowDropdown: (items, target, parentPath: Path) =>
    dispatch(
      navigateTo(
        [
          {
            selected: 'retentionDropdown',
            props: {items, position: 'top center', targetRect: target && target.getBoundingClientRect()},
          },
        ],
        parentPath
      )
    ),
  _onShowWarning: (days: number, onConfirm: () => void, onCancel: () => void, parentPath: Path) => {
    dispatch(
      navigateTo(
        [
          {
            selected: 'retentionWarning',
            props: {days, onCancel, onConfirm, entityType},
          },
        ],
        parentPath
      )
    )
  },
  setRetentionPolicy: (policy: RetentionPolicy) => {
    if (['small team', 'big team'].includes(entityType)) {
      // we couldn't get here without throwing an error for !teamname
      teamname && dispatch(TeamsGen.createSetTeamRetentionPolicy({policy, teamname}))
    } else if (['adhoc', 'channel'].includes(entityType)) {
      // we couldn't get here without throwing an error for !conversationIDKey
      conversationIDKey && dispatch(createSetConvRetentionPolicy({policy, conversationIDKey}))
    } else {
      throw new Error(`RetentionPicker: impossible entityType encountered: ${entityType}`)
    }
  },
})

export default compose(
  connect(mapStateToProps, mapDispatchToProps),
  setDisplayName('RetentionPicker'),
  withStateHandlers({_parentPath: null}, {_setParentPath: () => _parentPath => ({_parentPath})}),
  lifecycle({
    componentWillMount: function() {
      this.props._setParentPath(this.props._path)
    },
    componentDidMount: function() {
      this.props._loadTeamPolicy()
    },
  }),
  withHandlers({
    onShowDropdown: ({_parentPath, _onShowDropdown}) => (items, target) =>
      _onShowDropdown(items, target, _parentPath),
    onShowWarning: ({_parentPath, _onShowWarning}) => (days, onConfirm, onCancel) =>
      _onShowWarning(days, onConfirm, onCancel, _parentPath),
  })
)(RetentionPicker)
