#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { ClusterStack } from '../lib/cluster-stack';
import { ContainerStack } from '../lib/container-stack';
import { CicdStack } from '../lib/cicd-stack';
import { Cluster } from '@aws-cdk/aws-eks';

const app = new cdk.App();

const account = app.node.tryGetContext('account') || process.env.CDK_INTEG_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT;
const primaryRegion = {account: account, region: 'ap-northeast-2'};
const secondaryRegion = {account: account, region: 'us-west-2'};

const primaryCluster = new ClusterStack(app, `ClusterStack-${primaryRegion.region}`, {env: primaryRegion});
new ContainerStack(app, `ContainerStack-${primaryRegion.region}`, {env: primaryRegion, cluster:primaryCluster.cluster});

//const secondaryCluster = new ClusterStack(app, `ClusterStack-${secondaryRegion.region}`, {env: secondaryRegion});
//new ContainerStack(app, `ContainerStack-${secondaryRegion.region}`, {env: secondaryRegion, cluster:secondaryCluster.cluster});

new CicdStack(app, `CicdStack`, {env: primaryRegion, firstRegionCluster: primaryCluster.cluster, firstRegionRole: primaryCluster.firstRegionRole});
