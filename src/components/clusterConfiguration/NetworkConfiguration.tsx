import React, { useEffect } from 'react';
import { useFormikContext } from 'formik';
import { Checkbox } from '@patternfly/react-core';
import AdvancedNetworkFields from './AdvancedNetworkFields';
import { HostSubnets, NetworkConfigurationValues } from '../../types/clusters';
import { Cluster } from '../../api';
import { isSingleNodeCluster } from '../clusters/utils';
import { isAdvConf } from './utils';
import { useDefaultConfiguration } from './ClusterDefaultConfigurationContext';
import {
  AvailableSubnetsControl,
  UserManagedNetworkingTextContent,
  VirtualIPControlGroup,
} from '../clusterWizard/networkingSteps';
import { RenderIf } from '../ui/RenderIf';
import { NO_SUBNET_SET } from '../../config';

type NetworkConfigurationProps = {
  cluster: Cluster;
  hostSubnets: HostSubnets;
};

const NetworkConfiguration = ({ cluster, hostSubnets }: NetworkConfigurationProps) => {
  const { setFieldValue, values, touched, validateField } = useFormikContext<
    NetworkConfigurationValues
  >();
  const defaultNetworkSettings = useDefaultConfiguration([
    'clusterNetworkCidr',
    'serviceNetworkCidr',
    'clusterNetworkHostPrefix',
  ]);

  const [isAdvanced, setAdvanced] = React.useState(isAdvConf(cluster, defaultNetworkSettings));

  const toggleAdvConfiguration = (checked: boolean) => {
    setAdvanced(checked);

    if (!checked) {
      setFieldValue('clusterNetworkCidr', defaultNetworkSettings.clusterNetworkCidr);
      setFieldValue('serviceNetworkCidr', defaultNetworkSettings.serviceNetworkCidr);
      setFieldValue('clusterNetworkHostPrefix', defaultNetworkSettings.clusterNetworkHostPrefix);
    }
  };

  const isMultiNodeCluster = !isSingleNodeCluster(cluster);
  const isUserManagedNetworking = values.networkingType === 'userManaged';

  useEffect(() => {
    if (isUserManagedNetworking) {
      const shouldValidate = true;

      // We need to reset these fields' values in order to align with the values the server sends
      setFieldValue('vipDhcpAllocation', false);
      setFieldValue('ingressVip', '', !shouldValidate);
      setFieldValue('apiVip', '', !shouldValidate);
      if (!touched.hostSubnet || isMultiNodeCluster) {
        setFieldValue('hostSubnet', NO_SUBNET_SET, !shouldValidate);
      }
    } else {
      if (!values.vipDhcpAllocation) {
        validateField('ingressVip');
        validateField('apiVip');
      }
    }
  }, [
    touched.hostSubnet,
    isMultiNodeCluster,
    isUserManagedNetworking,
    setFieldValue,
    values.vipDhcpAllocation,
    validateField,
  ]);

  return (
    <>
      {
        // TODO(jkilzi): The BE currently doesn't support user-managed networking in a non-SNO
        // installation. Once they implement support for this scenario we can uncomment the line
        // below and add an import statement for the ManagedNetworkingControlGroup component above.
        // See https://issues.redhat.com/browse/MGMT-6608 for more info.
        /*<ManagedNetworkingControlGroup disabled={!isMultiNodeCluster} />*/
      }
      <RenderIf condition={isUserManagedNetworking}>
        <UserManagedNetworkingTextContent shouldDisplayLoadBalancersBullet={isMultiNodeCluster} />
      </RenderIf>

      <RenderIf condition={!(isMultiNodeCluster && isUserManagedNetworking)}>
        <AvailableSubnetsControl
          hostSubnets={hostSubnets}
          hosts={cluster.hosts || []}
          isRequired={!isUserManagedNetworking}
        />
      </RenderIf>

      <RenderIf condition={!isUserManagedNetworking}>
        <VirtualIPControlGroup cluster={cluster} hostSubnets={hostSubnets} />
      </RenderIf>

      <Checkbox
        id="useAdvancedNetworking"
        label="Use Advanced Networking"
        description="Configure advanced networking properties (e.g. CIDR ranges)."
        isChecked={isAdvanced}
        onChange={toggleAdvConfiguration}
      />
      <RenderIf condition={isAdvanced}>
        <AdvancedNetworkFields />
      </RenderIf>
    </>
  );
};

export default NetworkConfiguration;
