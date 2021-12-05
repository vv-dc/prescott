import {
  buildDockerfile,
  buildImage,
  buildLimitations,
  escapeCmd,
} from '@plugins/docker/docker.utils';
import { CommandBuilder } from '@lib/command-builder';
import { Limitations } from '@model/domain/limitations';

describe('docker.utils unit', () => {
  describe('buildImage', () => {
    it("should use version if it's provided", () => {
      const actual = buildImage('node', '16.13.0');
      expect(actual).toEqual('node:16.13.0');
    });

    it('should use default if version if it is not provided', () => {
      const actual = buildImage('node');
      expect(actual).toEqual('node:latest');
    });
  });

  describe('buildDockerfile', () => {
    it('should not include copy if copy is false', () => {
      const [image, cmd] = ['node:16.13.0', 'echo "hello, world!"'];
      const actual = buildDockerfile(image, cmd, false);

      const expected = `FROM ${image} AS base\nWORKDIR /usr/src/app\nCMD ${escapeCmd(
        cmd
      )}`;
      expect(actual).toEqual(expected);
    });

    it('should include copy is copy is true', () => {
      const [image, cmd] = ['node:16.130', 'echo "hello, world!"'];
      const actual = buildDockerfile(image, cmd, true);

      const expected = `FROM ${image} AS base\nWORKDIR /usr/src/app\nCOPY . .\nCMD ${escapeCmd(
        cmd
      )}`;
      expect(actual).toEqual(expected);
    });
  });

  describe('buildLimitations', () => {
    it('should correctly match limitations', () => {
      const builder = new CommandBuilder().init('docker run');
      const limitations: Limitations = {
        cpus: 1.5,
        ram: '1g',
        rom: '10g',
      };

      buildLimitations(builder, limitations);
      const actual = builder.build();

      const expected =
        'docker run --cpus=1.5 --memory=1g --storage-opt size=10g';
      expect(actual).toEqual(expected);
    });
  });
});
