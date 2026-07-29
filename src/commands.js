import {
  ChannelType,
  SlashCommandBuilder,
} from "discord.js";

export const commandBuilders = [
  new SlashCommandBuilder()
    .setName("차원통신")
    .setDescription("익명 서버 랜덤 채팅을 설정하고 사용합니다.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("채널설정")
        .setDescription("익명 랜덤 채팅 채널을 설정합니다.")
        .addChannelOption((option) =>
          option
            .setName("채널")
            .setDescription("상대 서버 메시지를 주고받을 채널")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("연결설정")
        .setDescription("다른 디스코드 서버와 연결될지 설정합니다.")
        .addStringOption((option) =>
          option
            .setName("상태")
            .setDescription("랜덤 연결 참여 여부")
            .setRequired(true)
            .addChoices(
              { name: "참여", value: "enabled" },
              { name: "중지", value: "disabled" },
            ),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("상태")
        .setDescription("이 서버의 익명 채팅 설정과 연결 상태를 확인합니다."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("내프로필")
        .setDescription("상대 서버에 표시될 내 서버 프로필을 확인합니다."),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("한줄메시지설정")
        .setDescription("상대 서버에 보여줄 서버 한줄 메시지를 설정합니다.")
        .addStringOption((option) =>
          option
            .setName("메시지")
            .setDescription("상대 서버에 보여줄 짧은 소개")
            .setMaxLength(120)
            .setRequired(true),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("프로필공개")
        .setDescription("연결 시 상대 서버에 내 서버 프로필을 공개할지 설정합니다.")
        .addStringOption((option) =>
          option
            .setName("공개여부")
            .setDescription("방 사진, 현재 인원, 한줄 메시지 공개 여부")
            .setRequired(true)
            .addChoices(
              { name: "공개", value: "public" },
              { name: "비공개", value: "private" },
            ),
        ),
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("신고")
        .setDescription("현재 연결된 상대 서버를 신고하고 연결을 종료합니다.")
        .addStringOption((option) =>
          option
            .setName("사유")
            .setDescription("신고 사유")
            .setMaxLength(500)
            .setRequired(true),
        ),
    ),
];

export const commandPayload = commandBuilders.map((command) => command.toJSON());
