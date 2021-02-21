import * as cdk from '@aws-cdk/core';
import codecommit = require('@aws-cdk/aws-codecommit');
import ecr = require('@aws-cdk/aws-ecr');
import codepipeline = require('@aws-cdk/aws-codepipeline');
import pipelineAction = require('@aws-cdk/aws-codepipeline-actions');
import { codeToECRspec, deployToEKSspec } from '../utils/buildspecs';
import { CicdProps} from './cluster-stack';

export class CicdStack extends cdk.Stack {

    constructor(scope: cdk.Construct, id: string, props: CicdProps) {
        super(scope, id, props);

        const primaryRegion = 'ap-northeast-2';
        const secondaryRegion = 'us-west-2';

        //Create a CodeCommit repository.
        //Print out the repository URI as a stack output
        const helloPyRepo = new codecommit.Repository(this, 'hello-py-for-demogo', {
            repositoryName: `hello-py-${cdk.Stack.of(this).region}`
        });

        new cdk.CfnOutput(this, `codecommit-uri`, {
            exportName: 'CodeCommitURL',
            value: helloPyRepo.repositoryCloneUrlHttp
        });

        //Creates an ECR repository
        //in production, it is recommended to manage the build image in a separate ECR.
        const ecrForMainRegion = new ecr.Repository(this, `ecr-for-hello-py);`)

        //CodeBuild for Container image build
        const buildForECR = codeToECRspec(this, ecrForMainRegion.repositoryUri);
        ecrForMainRegion.grantPullPush(buildForECR.role!);

        //CodeBuild for deployment to EKS
        const deployToMainCluster = deployToEKSspec(this, primaryRegion, props.firstRegionCluster, ecrForMainRegion, props.firstRegionRole);
        //const deployTo2ndCluster = deployToEKSspec(this, secondaryRegion, props.secondRegionCluster, ecrForMainRegion, props.secondRegionRole);
        
        //CodePipeline

        //sourceOutput is defined to pass committed code to Pipeline as an artifact.
        const sourceOutput = new codepipeline.Artifact();

        new codepipeline.Pipeline(this, 'multi-region-eks-dep', {
            stages: [ {
                    stageName: 'Source',
                    actions: [ new pipelineAction.CodeCommitSourceAction({
                            actionName: 'CatchSourcefromCode',
                            repository: helloPyRepo,
                            output: sourceOutput,
                        })]
                },{
                    stageName: 'Build',
                    actions: [ new pipelineAction.CodeBuildAction({
                        actionName: 'BuildAndPushtoECR',
                        input: sourceOutput,
                        project: buildForECR
                    })]
                },
                {
                    stageName: 'DeployToMainEKScluster',
                    actions: [ new pipelineAction.CodeBuildAction({
                        actionName: 'DeployToMainEKScluster',
                        input: sourceOutput,
                        project: deployToMainCluster
                    })]
                },{
                    stageName: 'ApproveToDeployTo2ndRegion',
                    actions: [ new pipelineAction.ManualApprovalAction({
                            actionName: 'ApproveToDeployTo2ndRegion'
                    })]    
                // },{
                //     stageName: 'DeployTo2ndRegionCluster',
                //     actions: [new pipelineAction.CodeBuildAction({
                //         actionName: 'DeployTo2ndEKScluster',
                //         input: sourceOutput,
                //         project: deployTo2ndCluster
                //     })]
                // }
                }
            ]
        });

    }
}


