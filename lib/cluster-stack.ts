import * as cdk from '@aws-cdk/core';
import * as iam from '@aws-cdk/aws-iam';
import * as eks from '@aws-cdk/aws-eks';
import * as ec2 from '@aws-cdk/aws-ec2';
import { PhysicalName } from '@aws-cdk/core';
import { DefaultCapacityType } from '@aws-cdk/aws-eks';

export class ClusterStack extends cdk.Stack {
  
  public readonly cluster: eks.Cluster;
  public readonly firstRegionRole: iam.Role;
  public readonly secondRegionRole: iam.Role;

  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const primaryRegion = 'ap-northeast-2';

    const clusterAdmin = new iam.Role(this, 'AdminRole', {
      assumedBy: new iam.AccountRootPrincipal()
    });

    const cluster = new eks.Cluster(this, 'woo-cluster', {
      clusterName: `wookub`,
      mastersRole: clusterAdmin,
      version: eks.KubernetesVersion.V1_18,
      defaultCapacity: 2,
      defaultCapacityInstance: cdk.Stack.of(this).region == primaryRegion?
                                new ec2.InstanceType('r5.2xlarge') : new ec2.InstanceType('m5.2xlarge')
    });

    cluster.addAutoScalingGroupCapacity('spot-group', {
      instanceType: new ec2.InstanceType('m5.xlarge'),
      spotPrice: cdk.Stack.of(this).region==primaryRegion ? '0.248' : '0.192'
    });

    this.cluster = cluster;

    if (cdk.Stack.of(this).region == primaryRegion) {
      this.firstRegionRole = createDeployRole(this, `for-1st-region`, cluster)
    }
    else {
      this.secondRegionRole = createDeployRole(this, `for-2nd-region`, cluster);
    };
    
  }
}

function createDeployRole(scope: cdk.Construct, id: string, cluster: eks.Cluster): iam.Role {
  const role = new iam.Role(scope, id, {
    roleName: PhysicalName.GENERATE_IF_NEEDED,
    assumedBy: new iam.AccountRootPrincipal()
  });
  cluster.awsAuth.addMastersRole(role);

  return role;
}

export interface EksProps extends cdk.StackProps {
  cluster: eks.Cluster
}

export interface CicdProps extends cdk.StackProps {
  firstRegionCluster: eks.Cluster,
  //secondRegionCluster: eks.Cluster,
  firstRegionRole: iam.Role,
  //secondRegionRole: iam.Role
}
